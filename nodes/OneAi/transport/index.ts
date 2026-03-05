import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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

export interface OneAiApiBinaryRequestOptions {
	method: IHttpRequestMethods;
	endpoint: string;
	body: Buffer;
	qs?: IDataObject;
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
			'Content-Type': 'application/octet-stream',
		},
		body: options.body,
	};

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
