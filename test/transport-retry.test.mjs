// Runs against the BUILT node (`dist/`), because that is what n8n loads: `npm test`.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { NodeApiError } = require('n8n-workflow');
const { classifyFailure, retryDelayMs, MAX_RETRIES } = require('../dist/nodes/OneAi/transport/retry.js');
const { oneAiApiRequest, oneAiApiRequestBinary } = require('../dist/nodes/OneAi/transport/index.js');

const NODE = { id: 'n', name: 'oneAI', type: 'oneAi', typeVersion: 1, position: [0, 0], parameters: {} };

/** A connection-level failure the way n8n-core hands it over: a NodeApiError wrapping the client's error. */
function connectionError(code) {
	const cause = Object.assign(new Error(`connect ${code} 162.55.150.72:443`), { code });
	return new NodeApiError(NODE, cause);
}

function httpError(status) {
	return new NodeApiError(NODE, clientHttpError(status));
}

/**
 * The HTTP client's own error, which is what an older host hands over (and what it keeps as
 * `cause`). The current host drops it, headers included, so `Retry-After` is only tested here.
 */
function clientHttpError(status, headers = {}) {
	return Object.assign(new Error(`Request failed with status code ${status}`), {
		response: { status, headers, data: {} },
		config: { headers: { Authorization: 'Bearer oai_secret' } },
	});
}

/** The slice of IExecuteFunctions the transport touches, answering from a script of outcomes. */
function context(outcomes, { aborted = false } = {}) {
	const calls = [];
	return {
		calls,
		getCredentials: async () => ({ url: 'https://oneai.example/' }),
		getNode: () => NODE,
		getExecutionCancelSignal: () => ({ aborted }),
		logger: { warn: () => {} },
		helpers: {
			httpRequestWithAuthentication: async (_type, options) => {
				options.headers.Authorization = 'Bearer oai_secret';
				calls.push(options);
				const next = outcomes.shift();
				if (next instanceof Error) throw next;
				return next;
			},
		},
	};
}

describe('classifyFailure', () => {
	it('reads the code from the NodeApiError a current n8n-core wraps it in', () => {
		assert.equal(classifyFailure(connectionError('ECONNREFUSED')), 'notProcessed');
		assert.equal(classifyFailure(connectionError('EAI_AGAIN')), 'notProcessed');
		assert.equal(classifyFailure(connectionError('ECONNRESET')), 'maybeProcessed');
	});

	it('reads the status of an HTTP failure', () => {
		assert.equal(classifyFailure(httpError(503)), 'notProcessed');
		assert.equal(classifyFailure(httpError(429)), 'notProcessed');
		assert.equal(classifyFailure(httpError(502)), 'maybeProcessed');
		assert.equal(classifyFailure(httpError(504)), 'maybeProcessed');
	});

	it('reads the client error an older host throws, directly or as cause', () => {
		const refused = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
		assert.equal(classifyFailure(refused), 'notProcessed');
		assert.equal(classifyFailure({ message: 'wrapped', cause: refused }), 'notProcessed');
		assert.equal(classifyFailure(clientHttpError(502)), 'maybeProcessed');
	});

	it('leaves every answer that would be the same next time alone', () => {
		for (const status of [400, 401, 403, 404, 409, 413, 500]) {
			assert.equal(classifyFailure(httpError(status)), undefined, String(status));
		}
		assert.equal(classifyFailure(new Error('boom')), undefined);
		assert.equal(classifyFailure(undefined), undefined);
	});
});

describe('retryDelayMs', () => {
	const refused = connectionError('ECONNREFUSED');

	it('backs off exponentially, jittered within the upper half, capped at 8 s', () => {
		const delays = (random) =>
			[1, 2, 3, 4].map((retry) => retryDelayMs({ error: refused, retry, idempotent: false, random }));
		assert.deepEqual(delays(() => 0), [500, 1000, 2000, 4000]);
		assert.deepEqual(delays(() => 1), [1000, 2000, 4000, 8000]);
	});

	it(`gives up after ${MAX_RETRIES} retries`, () => {
		assert.equal(retryDelayMs({ error: refused, retry: MAX_RETRIES + 1, idempotent: true }), undefined);
	});

	it('retries a possibly-processed failure only for an idempotent request', () => {
		const reset = connectionError('ECONNRESET');
		assert.equal(retryDelayMs({ error: reset, retry: 1, idempotent: false }), undefined);
		assert.notEqual(retryDelayMs({ error: reset, retry: 1, idempotent: true }), undefined);
	});

	it('honours Retry-After in seconds and as a date, and refuses one over 30 s', () => {
		const delay = (error, now) => retryDelayMs({ error, retry: 1, idempotent: false, now });
		assert.equal(delay(clientHttpError(429, { 'retry-after': '3' })), 3000);
		const now = Date.parse('2026-11-09T12:00:00Z');
		const at = new Date(now + 5000).toUTCString();
		assert.equal(delay(clientHttpError(503, { 'Retry-After': at }), now), 5000);
		assert.equal(delay(clientHttpError(429, { 'retry-after': '120' })), undefined);
	});
});

describe('the transport', () => {
	it('sends an upload again after a refused connection, and returns the answer', async () => {
		const ctx = context([connectionError('ECONNREFUSED'), { ok: true }]);
		const response = await oneAiApiRequestBinary.call(ctx, {
			method: 'PUT',
			endpoint: '/api/spaces/s/files/upload',
			body: Buffer.from('pdf'),
			qs: { path: 'a.pdf', replace: false },
			idempotent: false,
		});
		assert.deepEqual(response, { ok: true });
		assert.equal(ctx.calls.length, 2);
		// Each attempt is a fresh copy: the first attempt's header mutation does not leak.
		assert.notEqual(ctx.calls[0], ctx.calls[1]);
	});

	it('does not send a POST again when the connection broke after it may have arrived', async () => {
		const ctx = context([connectionError('ECONNRESET'), { id: 'second-chat' }]);
		await assert.rejects(
			oneAiApiRequest.call(ctx, { method: 'POST', endpoint: '/api/chats', body: { name: 'x' } }),
			(error) => error instanceof NodeApiError,
		);
		assert.equal(ctx.calls.length, 1);
	});

	it('does not retry a request the server answered for good', async () => {
		const ctx = context([httpError(400), { ok: true }]);
		await assert.rejects(oneAiApiRequest.call(ctx, { method: 'GET', endpoint: '/api/spaces' }));
		assert.equal(ctx.calls.length, 1);
	});

	it('stops retrying once the execution is cancelled', async () => {
		const ctx = context([connectionError('ECONNREFUSED'), { ok: true }], { aborted: true });
		await assert.rejects(oneAiApiRequest.call(ctx, { method: 'GET', endpoint: '/api/spaces' }));
		assert.equal(ctx.calls.length, 1);
	});

	it('surfaces the last failure without the credential once retries run out', async () => {
		// An older host's shape: the client error itself, carrying the request's headers.
		const failures = Array.from({ length: MAX_RETRIES + 1 }, () =>
			clientHttpError(503, { 'retry-after': '0' }),
		);
		const ctx = context([...failures]);
		await assert.rejects(oneAiApiRequest.call(ctx, { method: 'GET', endpoint: '/api/spaces' }), (error) => {
			assert.ok(error instanceof NodeApiError);
			assert.equal(failures.at(-1).config.headers.Authorization, undefined);
			return true;
		});
		assert.equal(ctx.calls.length, MAX_RETRIES + 1);
	});
});
