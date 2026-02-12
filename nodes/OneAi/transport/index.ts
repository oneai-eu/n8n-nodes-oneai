import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export interface OneAiApiRequestOptions {
	method: IHttpRequestMethods;
	endpoint: string;
	body?: IDataObject;
	qs?: IDataObject;
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

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'oneAiApi',
			requestOptions,
		);
		return response as JsonObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function oneAiApiRequestOpenAi(
	this: IExecuteFunctions,
	options: OneAiApiRequestOptions,
): Promise<JsonObject> {
	const credentials = await this.getCredentials('oneAiApi');

	const baseUrl = (credentials.url as string).replace(/\/$/, '');
	const apiKey = credentials.apiKey as string;

	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${baseUrl}${options.endpoint}`,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
	};

	if (options.body && Object.keys(options.body).length > 0) {
		requestOptions.body = options.body;
	}

	if (options.qs && Object.keys(options.qs).length > 0) {
		requestOptions.qs = options.qs;
	}

	try {
		const response = await this.helpers.httpRequest(requestOptions);
		return response as JsonObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// n8n does not support streaming, so we use the streaming responses, aggregate them and then return them as one single object.
export async function oneAiApiRequestStream(
	this: IExecuteFunctions,
	options: OneAiApiRequestOptions,
): Promise<JsonObject> {
	const credentials = await this.getCredentials('oneAiApi');

	const baseUrl = (credentials.url as string).replace(/\/$/, '');
	const apiKey = credentials.apiKey as string;

	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${baseUrl}${options.endpoint}`,
		headers: {
			Accept: 'text/event-stream',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		encoding: 'text',
		timeout: 300_000, // 5 mins
	};

	if (options.body && Object.keys(options.body).length > 0) {
		requestOptions.body = options.body;
	}

	if (options.qs && Object.keys(options.qs).length > 0) {
		requestOptions.qs = options.qs;
	}

	try {
		const response = await this.helpers.httpRequest(requestOptions);

		let sseText: string;
		if (typeof response === 'string') {
			sseText = response;
		} else {
			return response as JsonObject;
		}

		return parseSseResponse(this, sseText);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

function parseSseResponse(ctx: IExecuteFunctions, sseText: string): JsonObject {
	const lines = sseText.split('\n');
	let currentEvent = '';
	let dataLines: string[] = [];

	for (const line of lines) {
		if (line.startsWith('event: ')) {
			currentEvent = line.slice(7).trim();
			dataLines = [];
		} else if (line.startsWith('data: ')) {
			dataLines.push(line.slice(6));
		} else if (line === '') {
			if (currentEvent === 'response.completed' && dataLines.length > 0) {
				const parsed = JSON.parse(dataLines.join('\n'));
				return (parsed.response ?? parsed) as JsonObject;
			}
			currentEvent = '';
			dataLines = [];
		}
	}

	throw new NodeOperationError(
		ctx.getNode(),
		'No response.completed event found in the SSE stream.',
	);
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

	let responseData: JsonObject;
	do {
		responseData = await oneAiApiRequest.call(this, {
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
			break;
		}
	} while (true);

	return returnData;
}
