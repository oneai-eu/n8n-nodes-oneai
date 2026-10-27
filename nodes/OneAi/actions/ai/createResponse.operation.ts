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
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
				description: 'Send a message array, e.g. one built by an earlier node',
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
		description:
			'The messages to send. Only user messages reach the chat; instructions belong in the project, agent or persona.',
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
		default: '[\n  {\n    "type": "message",\n    "role": "user",\n    "content": "Hello"\n  }\n]',
		description:
			'Array of message objects, each with "role" and "content" (a string or an array of text parts). Only user messages are sent: a oneAI chat takes its instructions from the project, agent or persona, and its earlier turns from the chat history.',
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
			'Whether to use an existing oneAI chat. When disabled, a new chat is automatically created in your personal project.',
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

/** A Responses-style content part. Only the text kinds can be carried by a chat message. */
type ContentPart = string | { type?: string; text?: string };

const TEXT_PART_TYPES = ['input_text', 'text', 'output_text'];

/** One message as the author gave it, before it is reduced to the chat turn oneAI accepts. */
interface InputMessage {
	role: string;
	content: string | ContentPart[];
}

/**
 * The text of one message. `content` is a string, or a Responses-style content array whose text
 * parts are `{ type: 'input_text' | 'text' | 'output_text', text }`.
 *
 * Anything else - an image, a file - is refused instead of sent: `POST /api/chats/{chatId}/http`
 * takes one plain-text `message`, so there is nowhere to put it, and stringifying the array sent
 * `[object Object]` to the model as if the author had typed it.
 */
function messageText(
	this: IExecuteFunctions,
	content: InputMessage['content'],
	index: number,
): string {
	if (typeof content === 'string') {
		return content;
	}
	if (!Array.isArray(content)) {
		throw new NodeOperationError(
			this.getNode(),
			'Each message needs a "content" that is a string or an array of text parts.',
			{ itemIndex: index },
		);
	}
	return content
		.map((part) => {
			if (typeof part === 'string') {
				return part;
			}
			if (typeof part.text === 'string' && TEXT_PART_TYPES.includes(part.type ?? '')) {
				return part.text;
			}
			throw new NodeOperationError(
				this.getNode(),
				`A message part of type "${part.type}" cannot be sent: a oneAI chat message carries text only.`,
				{
					itemIndex: index,
					description:
						'Upload files to a space and reference them in the chat instead, or use the oneAI Gateway for multimodal input.',
				},
			);
		})
		.join('\n');
}

/** The messages to send, from either input mode. */
function readInput(this: IExecuteFunctions, inputMode: string, index: number): InputMessage[] {
	if (inputMode === 'messages') {
		const messagesData = this.getNodeParameter('messages', index) as {
			messageValues?: Array<{ role: string; content: string }>;
		};
		return messagesData.messageValues ?? [];
	}
	// n8n hands a `json` parameter over already parsed when it is set by an expression, and as
	// text when it is typed in.
	const raw = this.getNodeParameter('messagesJson', index) as string | InputMessage[];
	let parsed = raw;
	if (typeof raw === 'string') {
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Messages (JSON) is not valid JSON.', {
				itemIndex: index,
			});
		}
	}
	if (!Array.isArray(parsed)) {
		throw new NodeOperationError(this.getNode(), 'Messages (JSON) must be an array of messages.', {
			itemIndex: index,
		});
	}
	return parsed;
}

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('model', index) as string;
	const inputMode = this.getNodeParameter('inputMode', index) as string;
	const associateChat = this.getNodeParameter('associateChat', index, false) as boolean;

	const input = readInput.call(this, inputMode, index);

	// A oneAI chat turn is one user message: the chat's project, agent or persona supplies the
	// instructions, and the earlier turns come from the chat's own history. System, developer and
	// assistant messages therefore have no place in the request. They used to vanish without a
	// word; refusing them would break every saved workflow that carries one, so they are still
	// left out, but the author is now told.
	const userMessages = input.filter((m) => m.role === 'user');
	if (userMessages.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one user message is required.', {
			itemIndex: index,
		});
	}
	const ignoredRoles = [
		...new Set(input.filter((m) => m.role !== 'user' && m.content !== '').map((m) => m.role)),
	];
	// `addExecutionHints` is missing on older hosts, and we declare `n8n-workflow: *`.
	if (ignoredRoles.length > 0 && typeof this.addExecutionHints === 'function') {
		this.addExecutionHints({
			type: 'warning',
			location: 'outputPane',
			message: `Only user messages are sent to a oneAI chat; the ${ignoredRoles.join(', ')} message(s) were not sent. Put instructions into the project's system prompt, an agent or a persona instead.`,
		});
	}
	const content = userMessages.map((m) => messageText.call(this, m.content, index)).join('\n\n');

	let chatId: string;
	if (associateChat) {
		chatId = this.getNodeParameter('chatId', index) as string;
	} else {
		const authResponse = await oneAiApiRequest.call(this, {
			method: 'GET',
			endpoint: '/api/auth/check',
		});
		// `personalProject` really is what `POST /api/chats` wants in `spaceId`: a chat can
		// only be created in a project, and a project is a space whose provider is `project`.
		const personalProject = authResponse.personalProject as string;
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
	}

	const chatOptions = this.getNodeParameter('chatOptions', index, {}) as {
		timeZone?: string;
	};
	const additionalOptions = this.getNodeParameter('additionalOptions', index) as {
		reasoningEffort?: string;
	};

	const body: IDataObject = {
		message: content,
		model,
	};

	if (chatOptions.timeZone) {
		body.timeZone = chatOptions.timeZone;
	}

	// Sent as chosen, and left to oneAI to apply: it drops the effort for a model that does not
	// reason and defaults to `medium` for one that does. Deciding that here needed a second
	// request per item, and judged the model the author named - wrong for `auto` and for a chat
	// whose agent pins its own model.
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
			json: {
				text: (response as IDataObject).response,
				...(response as IDataObject),
			},
			pairedItem: { item: index },
		},
	];
}
