import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';
import { isIdempotent, retryDelayMs } from './retry';

export interface OneAiApiRequestOptions {
	method: IHttpRequestMethods;
	endpoint: string;
	body?: IDataObject;
	qs?: IDataObject;
	/**
	 * Whether sending this request twice has the same effect as sending it once. Defaults to
	 * true for GET and HEAD and false for everything else; see `retry.ts` for what it decides.
	 */
	idempotent?: boolean;
}

/**
 * Request-ish shapes an HTTP client attaches to a rejected request. Only the
 * parts that can carry the credential are named; everything else is left alone,
 * because `NodeApiError` reads other fields to derive its message and status.
 */
interface ErrorWithRequestConfig {
	config?: { headers?: IDataObject };
	response?: { config?: { headers?: IDataObject } };
}

/**
 * Remove the credential from a failed request before the error is handed to
 * `NodeApiError`.
 *
 * 🔴 Why this exists. `NodeApiError` keeps the original error as `cause`, and
 * whether that survives serialization into n8n's saved execution record depends
 * on the host's `n8n-workflow`: the base class declares a `cause` class field
 * from 1.99.0 onward (n8n 1.102.0), which shadows it out of `toJSON()`. Before
 * that it is an own enumerable property, so `Authorization: Bearer oai_…` is
 * written into `execution_data` and is readable by anyone who can open a failed
 * execution or read n8n's database.
 *
 * We declare `"n8n-workflow": "*"` as a peer dependency and no `engines`, so we
 * cannot assume the newer host. Scrubbing here makes the outcome independent of
 * the host version instead of dependent on it, which is the property worth
 * having: a mitigation that only works on hosts that did not need it is not a
 * mitigation.
 *
 * The error object is about to be discarded, so it is scrubbed in place — that
 * keeps its prototype and every other field intact for `NodeApiError`'s own
 * parsing. Header names are matched case-insensitively because clients
 * normalize them inconsistently.
 */
function withoutCredential(error: unknown): JsonObject {
	const candidate = error as ErrorWithRequestConfig;
	const SENSITIVE = new Set(['authorization', 'cookie', 'x-api-key', 'proxy-authorization']);

	for (const headers of [candidate?.config?.headers, candidate?.response?.config?.headers]) {
		if (!headers) continue;
		for (const name of Object.keys(headers)) {
			if (SENSITIVE.has(name.toLowerCase())) {
				delete headers[name];
			}
		}
	}

	return error as JsonObject;
}

/**
 * Send one request to oneAI, retrying the failures `retry.ts` calls transient, and surface
 * anything else as a `NodeApiError` with the credential scrubbed.
 *
 * Each attempt gets its own copy of the options because the credential helper adds the
 * `Authorization` header to the object it is given. The wait between attempts uses
 * `n8n-workflow`'s `sleep` (community nodes may not touch `setTimeout`), and a cancelled
 * execution stops retrying rather than waiting out the backoff.
 */
async function send(
	this: IExecuteFunctions,
	requestOptions: IHttpRequestOptions,
	idempotent: boolean | undefined,
): Promise<unknown> {
	const retryable = isIdempotent(requestOptions.method ?? 'GET', idempotent);
	for (let retry = 1; ; retry++) {
		try {
			return await this.helpers.httpRequestWithAuthentication.call(this, 'oneAiApi', {
				...requestOptions,
				headers: { ...requestOptions.headers },
			});
		} catch (error) {
			const delay = retryDelayMs({ error, retry, idempotent: retryable });
			if (delay === undefined || this.getExecutionCancelSignal?.()?.aborted === true) {
				throw new NodeApiError(this.getNode(), withoutCredential(error));
			}
			this.logger.warn(
				`oneAI request ${requestOptions.method ?? 'GET'} ${requestOptions.url} failed transiently; retry ${retry} in ${delay} ms`,
			);
			await sleep(delay);
		}
	}
}

export async function oneAiApiRequest(
	this: IExecuteFunctions,
	options: OneAiApiRequestOptions,
): Promise<JsonObject> {
	const credentials = await this.getCredentials('oneAiApi');

	const baseUrl = (credentials.url as string).replace(/\/$/, '');

	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${baseUrl}${options.endpoint}`,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
	};

	if (options.body && Object.keys(options.body).length > 0) {
		requestOptions.body = options.body;
	}

	if (options.qs && Object.keys(options.qs).length > 0) {
		requestOptions.qs = options.qs;
	}

	return (await send.call(this, requestOptions, options.idempotent)) as JsonObject;
}

/**
 * Perform a request whose response body is binary (e.g. synthesized speech
 * audio) rather than JSON. Returns the raw bytes as a Buffer. The request body,
 * when present, is still sent as JSON.
 */
export async function oneAiApiRequestRaw(
	this: IExecuteFunctions,
	options: OneAiApiRequestOptions,
): Promise<Buffer> {
	const credentials = await this.getCredentials('oneAiApi');

	const baseUrl = (credentials.url as string).replace(/\/$/, '');

	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${baseUrl}${options.endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
		// Force a binary response body. Pre-serialize the request body so the
		// `json` flag (which would coerce the response back to JSON) is not needed.
		encoding: 'arraybuffer',
	};

	if (options.body && Object.keys(options.body).length > 0) {
		requestOptions.body = JSON.stringify(options.body);
	}

	if (options.qs && Object.keys(options.qs).length > 0) {
		requestOptions.qs = options.qs;
	}

	const response = await send.call(this, requestOptions, options.idempotent);
	return Buffer.from(response as ArrayBuffer);
}

export interface OneAiApiBinaryRequestOptions {
	method: IHttpRequestMethods;
	endpoint: string;
	body: Buffer;
	qs?: IDataObject;
	/**
	 * The media type of the raw body. Defaults to `application/octet-stream`, which is what the
	 * file-upload endpoints take. `POST /api/spaces/{spaceId}/tables/{tableName}/import-csv`
	 * declares `text/csv` and nothing else, so it has to be able to say so.
	 */
	contentType?: string;
	/** As on `OneAiApiRequestOptions`. */
	idempotent?: boolean;
}

export async function oneAiApiRequestBinary(
	this: IExecuteFunctions,
	options: OneAiApiBinaryRequestOptions,
): Promise<JsonObject> {
	const credentials = await this.getCredentials('oneAiApi');

	const baseUrl = (credentials.url as string).replace(/\/$/, '');

	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${baseUrl}${options.endpoint}`,
		headers: {
			'Content-Type': options.contentType ?? 'application/octet-stream',
		},
		body: options.body,
	};

	if (options.qs && Object.keys(options.qs).length > 0) {
		requestOptions.qs = options.qs;
	}

	return (await send.call(this, requestOptions, options.idempotent)) as JsonObject;
}

export async function oneAiApiRequestAllItems(
	this: IExecuteFunctions,
	options: Omit<OneAiApiRequestOptions, 'qs'> & {
		qs?: IDataObject;
		itemsKey: string;
		paginationKey?: string;
	},
): Promise<JsonObject[]> {
	const returnData: JsonObject[] = [];
	let page = 0;
	const pageSize = 100;

	let hasMore = true;
	while (hasMore) {
		const responseData = await oneAiApiRequest.call(this, {
			...options,
			qs: {
				...options.qs,
				page,
				pageSize,
			},
		});

		const items = responseData[options.itemsKey] as JsonObject[];
		if (items && Array.isArray(items)) {
			returnData.push(...items);
		}

		page++;

		const pagination = options.paginationKey
			? (responseData[options.paginationKey] as JsonObject)
			: responseData;

		const hasNextPage = pagination?.hasNextPage as boolean;
		const totalCount = pagination?.totalCount as number;

		if (hasNextPage === false || (totalCount !== undefined && returnData.length >= totalCount)) {
			hasMore = false;
		}
	}

	return returnData;
}
