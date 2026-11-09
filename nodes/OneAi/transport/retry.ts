import type { IHttpRequestMethods } from 'n8n-workflow';

/**
 * When a failed request to oneAI is worth sending again, and how long to wait first.
 *
 * Why this exists. A workflow that spends minutes reading documents through the AI resource and
 * then uploads the result loses the whole run to a connection oneAI's edge refused for a few
 * seconds (`connect ECONNREFUSED …:443`, reported by a customer on n8n 2.43.8). The service was
 * reachable seconds before and after. The node is the only party that can absorb that: n8n's
 * own "Retry On Fail" is off by default and retries the whole node, every item.
 *
 * The rule is about what the server can have done, not about the status code alone:
 *
 * - `notProcessed` - the request provably never reached oneAI, or oneAI said it did nothing
 *   (refused or unresolvable connection, 503, 429). Safe to send again for every method.
 * - `maybeProcessed` - the connection broke or a proxy gave up AFTER the request may have
 *   arrived (reset, timeout, 502, 504). Sending a POST again could create a second chat or a
 *   second dataset row, so this is retried only for a request the caller marks idempotent.
 */
export type TransientFailure = 'notProcessed' | 'maybeProcessed';

const NOT_PROCESSED_CODES = new Set([
	'ECONNREFUSED',
	'ENOTFOUND',
	'EAI_AGAIN',
	'ENETUNREACH',
	'EHOSTUNREACH',
]);

const MAYBE_PROCESSED_CODES = new Set([
	'ECONNRESET',
	'ETIMEDOUT',
	'ESOCKETTIMEDOUT',
	'ECONNABORTED',
	'EPIPE',
]);

const NOT_PROCESSED_STATUSES = new Set([429, 503]);
const MAYBE_PROCESSED_STATUSES = new Set([502, 504]);

/** Sending a request again, in total, at most this many times after the first attempt. */
export const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;
/** A `Retry-After` longer than this is not waited out; the error surfaces instead. */
const MAX_RETRY_AFTER_MS = 30_000;

interface ErrorLike {
	code?: unknown;
	httpCode?: unknown;
	status?: unknown;
	statusCode?: unknown;
	cause?: unknown;
	response?: { status?: unknown; headers?: Record<string, unknown> };
}

/**
 * The error and what it wraps, as far as the host still exposes it.
 *
 * n8n-core hands us a `NodeApiError`. On current hosts (`n8n-workflow` 2.x) it keeps neither the
 * HTTP client's error nor the response headers: `cause` is a class field left undefined for an
 * `Error`, and all that survives is `httpCode` - the status as a string (`'503'`) or, for a
 * connection failure, the error code (`'ECONNREFUSED'`). Older hosts keep the client's error as
 * `cause`, or throw it directly. All three are read; the depth is bounded because `cause`
 * chains are not guaranteed to end.
 */
function errorChain(error: unknown): ErrorLike[] {
	const chain: ErrorLike[] = [];
	let current: unknown = error;
	while (current !== null && typeof current === 'object' && chain.length < 4) {
		chain.push(current as ErrorLike);
		current = (current as ErrorLike).cause;
	}
	return chain;
}

function statusOf(link: ErrorLike): number | undefined {
	for (const candidate of [link.response?.status, link.httpCode, link.status, link.statusCode]) {
		const status = Number(candidate);
		if (Number.isInteger(status) && status >= 100 && status <= 599) return status;
	}
	return undefined;
}

export function classifyFailure(error: unknown): TransientFailure | undefined {
	for (const link of errorChain(error)) {
		const code = [link.code, link.httpCode].find(
			(candidate): candidate is string =>
				typeof candidate === 'string' && !/^\d+$/.test(candidate),
		);
		if (code !== undefined && NOT_PROCESSED_CODES.has(code)) return 'notProcessed';
		if (code !== undefined && MAYBE_PROCESSED_CODES.has(code)) return 'maybeProcessed';
		const status = statusOf(link);
		if (status !== undefined && NOT_PROCESSED_STATUSES.has(status)) return 'notProcessed';
		if (status !== undefined && MAYBE_PROCESSED_STATUSES.has(status)) return 'maybeProcessed';
	}
	return undefined;
}

/**
 * GET and HEAD read; sending them twice changes nothing. Every other method is idempotent only
 * when its caller says so: `PUT …/files/upload` is with `replace=true` and is not without it -
 * a second attempt after a first that landed answers "A file already exists".
 */
export function isIdempotent(method: IHttpRequestMethods, declared: boolean | undefined): boolean {
	return declared ?? (method === 'GET' || method === 'HEAD');
}

/**
 * `Retry-After` in milliseconds, from either of its two forms; undefined when absent or unusable.
 * Only reachable on hosts that keep the response (see `errorChain`); elsewhere the backoff applies.
 */
function retryAfterMs(error: unknown, now: number): number | undefined {
	for (const link of errorChain(error)) {
		const headers = link.response?.headers;
		if (!headers) continue;
		const raw = Object.entries(headers).find(([name]) => name.toLowerCase() === 'retry-after')?.[1];
		if (typeof raw !== 'string' && typeof raw !== 'number') continue;
		const seconds = Number(raw);
		if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
		const date = Date.parse(String(raw));
		if (!Number.isNaN(date)) return Math.max(0, date - now);
	}
	return undefined;
}

/**
 * How long to wait before retry number `retry` (1-based), or undefined when this failure must
 * not be retried. Exponential from 1 s, capped at 8 s, with the upper half jittered so that
 * the items of one execution do not all come back in the same instant.
 */
export function retryDelayMs(options: {
	error: unknown;
	retry: number;
	idempotent: boolean;
	random?: () => number;
	now?: number;
}): number | undefined {
	if (options.retry > MAX_RETRIES) return undefined;
	const failure = classifyFailure(options.error);
	if (failure === undefined) return undefined;
	if (failure === 'maybeProcessed' && !options.idempotent) return undefined;

	const requested = retryAfterMs(options.error, options.now ?? Date.now());
	if (requested !== undefined) {
		return requested <= MAX_RETRY_AFTER_MS ? requested : undefined;
	}
	const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (options.retry - 1));
	const random = options.random ?? Math.random;
	return Math.round(ceiling / 2 + random() * (ceiling / 2));
}
