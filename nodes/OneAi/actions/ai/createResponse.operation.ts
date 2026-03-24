import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		required: true,
		default: '',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getModels',
		},
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
			},
		},
	},
	{
		displayName: 'Input Mode',
		name: 'inputMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Messages',
				value: 'messages',
				description: 'Build messages with role and content fields',
			},
			{
				name: 'JSON',
				value: 'json',
				description:
					'Send a full message array (for multi-turn conversations, images, etc.)',
			},
		],
		default: 'messages',
		description: 'How to provide the input to the model',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
			},
		},
	},
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		required: true,
		default: { messageValues: [{ role: 'user', content: '' }] },
		description: 'The messages to send to the model',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
				inputMode: ['messages'],
			},
		},
		options: [
			{
				displayName: 'Message',
				name: 'messageValues',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{ name: 'User', value: 'user' },
							{ name: 'Assistant', value: 'assistant' },
							{ name: 'System', value: 'system' },
							{ name: 'Developer', value: 'developer' },
						],
						default: 'user',
						description: 'The role of the message sender',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'The message content',
					},
				],
			},
		],
	},
	{
		displayName: 'Messages (JSON)',
		name: 'messagesJson',
		type: 'json',
		required: true,
		default:
			'[\n  {\n    "type": "message",\n    "role": "user",\n    "content": "Hello"\n  }\n]',
		description:
			'Array of message objects. Each message needs "role" (user/assistant/system/developer) and "content" (string or content array).',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
				inputMode: ['json'],
			},
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
			},
		},
		options: [
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 1,
				},
				default: 1,
				description:
					'Sampling temperature (0-2). Lower values are more focused, higher values are more random.',
			},
			{
				displayName: 'Reasoning Effort',
				name: 'reasoningEffort',
				type: 'options',
				options: [
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' },
				],
				default: 'medium',
				description: 'How much reasoning effort the model should use',
			},
			{
				displayName: 'Reasoning Summary',
				name: 'reasoningSummary',
				type: 'options',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'Concise', value: 'concise' },
					{ name: 'Detailed', value: 'detailed' },
				],
				default: 'auto',
				description: 'How to summarize the reasoning process',
			},
			{
				displayName: 'Tools (JSON)',
				name: 'tools',
				type: 'json',
				default: '',
				description:
					'JSON array of tool definitions. Each tool needs "type", "name", "parameters" (JSON Schema), and optionally "description" and "strict".',
			},
		],
	},
	{
		displayName: 'Associate with Chat',
		name: 'associateChat',
		type: 'boolean',
		default: false,
		description:
			'Whether to send the message through a OneAI chat instead of the OpenAI create response endpoint directly. This allows resuming a chat or simply have a context for requests. This requires a reasoning effort.',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
			},
		},
	},
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The ID of the chat to send the message in. Create a chat first using the Chat > Create operation.',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
				associateChat: [true],
			},
		},
	},
	{
		displayName: 'Chat Options',
		name: 'chatOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
				associateChat: [true],
			},
		},
		options: [
			{
				displayName: 'Time Zone',
				name: 'timeZone',
				type: 'string',
				default: '',
				placeholder: 'Europe/Berlin',
				description:
					'Your timezone for timestamp formatting (e.g. "Europe/Berlin"). Defaults to the server timezone if left empty.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('model', index) as string;
	const inputMode = this.getNodeParameter('inputMode', index) as string;
	const associateChat = this.getNodeParameter('associateChat', index, false) as boolean;

	// Build input messages
	let input: IDataObject[];
	if (inputMode === 'messages') {
		const messagesData = this.getNodeParameter('messages', index) as {
			messageValues?: Array<{ role: string; content: string }>;
		};
		const messageValues = messagesData.messageValues ?? [];
		input = messageValues.map((msg) => ({
			type: 'message',
			role: msg.role,
			content: msg.content,
		}));
	} else {
		const messagesJson = this.getNodeParameter('messagesJson', index) as string;
		input = JSON.parse(messagesJson) as IDataObject[];
	}

	// if associate chat, then apply the chatoptions.
	if (associateChat) {
		const chatId = this.getNodeParameter('chatId', index) as string;
		const chatOptions = this.getNodeParameter('chatOptions', index, {}) as {
			timeZone?: string;
		};
		const additionalOptions = this.getNodeParameter('additionalOptions', index) as {
			reasoningEffort?: string;
		};

		const userMessages = input.filter((m) => m.role === 'user');
		if (userMessages.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one user message is required when using chat association.',
			);
		}
		const content = userMessages.map((m) => m.content as string).join('\n\n');

		const body: IDataObject = {
			message: content,
			model,
		};

		if (chatOptions.timeZone) {
			body.timeZone = chatOptions.timeZone;
		}

		if (additionalOptions.reasoningEffort) {
			body.reasoningEffort = additionalOptions.reasoningEffort;
		}

		const response = await oneAiApiRequest.call(this, {
			method: 'POST',
			endpoint: `/api/chats/${encodeURIComponent(chatId)}/http`,
			body,
		});

		return [
			{
				json: response as IDataObject,
				pairedItem: { item: index },
			},
		];
	}

	const additionalOptions = this.getNodeParameter('additionalOptions', index) as {
		temperature?: number;
		reasoningEffort?: string;
		reasoningSummary?: string;
		tools?: string;
	};

	const body: IDataObject = {
		model,
		input,
	};

	if (additionalOptions.temperature !== undefined) {
		body.temperature = additionalOptions.temperature;
	}

	if (additionalOptions.reasoningEffort || additionalOptions.reasoningSummary) {
		const reasoning: IDataObject = {};
		if (additionalOptions.reasoningEffort) {
			reasoning.effort = additionalOptions.reasoningEffort;
		}
		if (additionalOptions.reasoningSummary) {
			reasoning.summary = additionalOptions.reasoningSummary;
		}
		body.reasoning = reasoning;
	}

	if (additionalOptions.tools) {
		body.tools = JSON.parse(additionalOptions.tools as string);
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/openai/v1/responses',
		body,
	});

	let text = '';
	const output = response.output as IDataObject[] | undefined;
	if (output && Array.isArray(output)) {
		for (const item of output) {
			if (item.type === 'message') {
				const content = item.content as IDataObject[] | undefined;
				if (content && Array.isArray(content)) {
					for (const part of content) {
						if (part.type === 'output_text' && part.text) {
							text += (text ? '\n' : '') + (part.text as string);
						}
					}
				}
			}
		}
	}

	return [
		{
			json: {
				text,
				...(response as IDataObject),
			},
			pairedItem: { item: index },
		},
	];
}
