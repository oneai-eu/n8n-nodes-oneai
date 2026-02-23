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

export interface OneAiWebSocketOptions {
	chatId: string;
	model: string;
	content: string;
	reasoningEffort?: string;
	timeZone?: string;
	branchId?: string;
	regenerate?: string;
}

// This connects to the websocket /api/chats/:chatId/send endpoint, sends the user message,
// aggregates all deltas and then returns a single result
export async function oneAiApiRequestWebSocket(
	this: IExecuteFunctions,
	options: OneAiWebSocketOptions,
): Promise<JsonObject> {
	const credentials = await this.getCredentials('oneAiApi');
	const baseUrl = (credentials.url as string).replace(/\/$/, '');
	const apiKey = credentials.apiKey as string;

	const wsBase = baseUrl.replace(/^http/, 'ws');

	const queryId = crypto.randomUUID();
	const responseId = crypto.randomUUID();
	const timeZone =
		options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

	const params = new URLSearchParams({
		authorization: `Bearer ${apiKey}`,
		model: options.model,
		queryId,
		responseId,
		timeZone,
	});

	if (options.reasoningEffort) {
		params.set('reasoningEffort', options.reasoningEffort);
	}
	if (options.branchId) {
		params.set('branchId', options.branchId);
	}
	if (options.regenerate) {
		params.set('regenerate', options.regenerate);
	}

	const wsUrl = `${wsBase}/api/chats/${encodeURIComponent(options.chatId)}/send?${params.toString()}`;

	const node = this.getNode();

	return new Promise<JsonObject>((resolve, reject) => {
		const ws = new WebSocket(wsUrl);

		const textParts: string[] = [];
		const reasoningParts: string[] = [];
		const toolCalls: IDataObject[] = [];
		let newBranchId: string | undefined;
		let forkedChatId: string | undefined;
		let blocked = false;
		let settled = false;

		const signal = AbortSignal.timeout(300_000);
		signal.addEventListener('abort', () => {
			if (!settled) {
				settled = true;
				ws.close();
				reject(
					new NodeOperationError(
						node,
						'WebSocket chat request timed out after 5 minutes.',
					),
				);
			}
		});

		ws.addEventListener('open', () => {
			ws.send(
				JSON.stringify({
					type: 'user_message',
					content: options.content,
				}),
			);
		});

		ws.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(String(event.data)) as IDataObject;

				switch (data.type) {
					case 'text':
						textParts.push(data.text as string);
						break;
					case 'reasoning':
						reasoningParts.push(data.reasoning as string);
						break;
					case 'tool_input':
						toolCalls.push({
							callId: data.callId,
							name: data.name,
							input: data.input,
						});
						break;
					case 'tool_output': {
						const call = toolCalls.find(
							(c) => c.callId === data.callId,
						);
						if (call) call.output = data.output;
						break;
					}
					case 'branch_created':
						newBranchId = data.branchId as string;
						break;
					case 'chat_forked':
						forkedChatId = data.chatId as string;
						break;
					case 'chat_blocked':
						blocked = true;
						break;
				}
			} catch {
				// ignore
			}
		});

		ws.addEventListener('close', (event) => {
			if (settled) return;
			settled = true;

			if (blocked) {
				reject(
					new NodeOperationError(
						node,
						'Chat is blocked due to a compliance violation.',
					),
				);
				return;
			}

			if (event.code !== 1000) {
				reject(
					new NodeOperationError(
						node,
						`WebSocket closed with unexpected code ${event.code}: ${event.reason}`,
					),
				);
				return;
			}

			const result: IDataObject = {
				text: textParts.join(''),
				chatId: forkedChatId || options.chatId,
				queryId,
				responseId,
			};

			if (reasoningParts.length > 0) {
				result.reasoning = reasoningParts.join('');
			}

			if (toolCalls.length > 0) {
				result.toolCalls = toolCalls;
			}

			if (newBranchId) {
				result.branchId = newBranchId;
			}

			if (forkedChatId) {
				result.forkedFromChat = options.chatId;
			}

			resolve(result as JsonObject);
		});

		ws.addEventListener('error', () => {
			if (settled) return;
			settled = true;
			reject(
				new NodeOperationError(
					node,
					'WebSocket connection failed. Check that the OneAI URL is correct and the server is reachable.',
				),
			);
		});
	});
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
