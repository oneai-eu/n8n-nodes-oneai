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
		],
	},
	{
		displayName: 'Associate with Chat',
		name: 'associateChat',
		type: 'boolean',
		default: false,
		description:
			'Whether to use an existing OneAI chat. When disabled, a new chat is automatically created in your personal project.',
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


	let chatId: string;
	if (associateChat) {
		chatId = this.getNodeParameter('chatId', index) as string;
	} else {
		const authResponse = await oneAiApiRequest.call(this, {
			method: 'GET',
			endpoint: '/api/auth/check',
		});
		const personalProject = authResponse.personalProject as string;
		this.logger.info(personalProject)
		
		if (!personalProject) {
			throw new NodeOperationError(
				this.getNode(),
				'Could not determine personal project ID from authentication.',
			);
		}

		const chatName = `n8n-${new Date().toISOString().slice(0, 19).replace('T', '-')}`;
		const chatResponse = await oneAiApiRequest.call(this, {
			method: 'POST',
			endpoint: '/api/chats',
			body: { spaceId: personalProject, name: chatName, origin: 'n8n' },
		});
		chatId = chatResponse.chatId as string;
		this.logger.info(chatId)
	}

	const chatOptions = this.getNodeParameter('chatOptions', index, {}) as {
		timeZone?: string;
	};
	const additionalOptions = this.getNodeParameter('additionalOptions', index) as {
		reasoningEffort?: string;
	};

	const modelsResponse = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/chats/models',
	});
	const models = modelsResponse as unknown as Array<{ id: string; reasoning: boolean }>;
	const modelInfo = Array.isArray(models) ? models.find((m) => m.id === model) : undefined;

	const userMessages = input.filter((m) => m.role === 'user');
	if (userMessages.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one user message is required.',
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

	// ! only send reasoningEffort when the model supports reasoning
	if (modelInfo?.reasoning) {
		body.reasoningEffort = additionalOptions.reasoningEffort || 'medium';
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/chats/${encodeURIComponent(chatId)}/http`,
		body,
	});

	return [
		{
			json: {
				text: (response as IDataObject).response,
				...(response as IDataObject),
			},
			pairedItem: { item: index },
		},
	];
}
