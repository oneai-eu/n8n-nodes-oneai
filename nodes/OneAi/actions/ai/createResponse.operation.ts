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
			'Array of message objects, each with "role" and "content" (a string or an array of text parts). Only user messages are sent: a oneAI chat takes its instructions from the project, agent or persona, and its earlier turns from the chat history. Images go through Add Images.',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
				inputMode: ['json'],
			},
		},
	},
	{
		displayName: 'Add Images',
		name: 'addImages',
		type: 'boolean',
		default: false,
		description:
			"Whether to send images from the input item's binary data with the message, so the model sees them directly. The model must be able to read images, and oneAI must be a release that accepts images in chat messages.",
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
			},
		},
	},
	{
		displayName: 'Image Data Field Name(s)',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary image data',
		description:
			'Name of the binary field(s) holding the image(s), separate multiple field names with commas. PNG, JPEG, WebP or GIF; up to 8 images, 10 MB each, 25 MB together.',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createResponse'],
				addImages: [true],
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
 * Anything else - an image, a file - is refused instead of sent: `message` is plain text, and
 * stringifying the array sent `[object Object]` to the model as if the author had typed it. Images
 * travel in the request's own `images` field, filled from binary data by `readImages`.
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
						'Send images with Add Images (from binary fields) instead; a JSON message part carries text only.',
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

/**
 * The image contract of `POST /api/chats/{chatId}/http`: four image types, at most 8 images, 10 MB
 * each and 25 MB together, in decimal bytes. oneAI checks all of it again; mirroring it here lets
 * the error name the binary field, which the server never sees, and fails before ~33 MB of base64
 * is uploaded. The server's 35 MB body cap is left to its own 413.
 */
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 10_000_000;
const MAX_IMAGES_TOTAL_BYTES = 25_000_000;
/**
 * The contract's `filename` `max(255)`, counted in UTF-16 units like `slice`. The name is a display
 * label n8n derives from a URL, header or attachment, so it is cut to fit rather than refused.
 */
const MAX_FILENAME_LENGTH = 255;

/** One entry of the request's `images` array. */
type ChatImage = {
	contentType: (typeof IMAGE_TYPES)[number];
	/** Raw base64, no `data:` prefix. */
	data: string;
	filename?: string;
};

function isImageType(mimeType: string): mimeType is ChatImage['contentType'] {
	return (IMAGE_TYPES as readonly string[]).includes(mimeType);
}

/** Decimal megabytes, one decimal, matching how the contract states its limits. */
function megabytes(bytes: number): string {
	return (bytes / 1e6).toFixed(1);
}

/** The images of this item, read from the binary fields named in Image Data Field Name(s). */
async function readImages(this: IExecuteFunctions, index: number): Promise<ChatImage[]> {
	const names = (this.getNodeParameter('binaryPropertyName', index, 'data') as string)
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean);
	if (names.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'Image Data Field Name(s) is empty. Name at least one binary field, or turn off Add Images.',
			{ itemIndex: index },
		);
	}
	if (names.length > MAX_IMAGES) {
		throw new NodeOperationError(
			this.getNode(),
			`Too many images: ${names.length} binary fields named, oneAI accepts at most ${MAX_IMAGES} per message.`,
			{ itemIndex: index },
		);
	}

	const images: ChatImage[] = [];
	let totalBytes = 0;
	for (const name of names) {
		const meta = this.helpers.assertBinaryData(index, name);
		// Checked from the metadata, before the buffer is loaded, so a mis-named video is refused
		// without reading it.
		const declared = (meta.mimeType ?? '').toLowerCase().split(';')[0].trim();
		const mimeType = declared === 'image/jpg' ? 'image/jpeg' : declared;
		if (!isImageType(mimeType)) {
			throw new NodeOperationError(
				this.getNode(),
				`Binary field "${name}" is ${mimeType || 'of unknown type'}; Create Response accepts PNG, JPEG, WebP or GIF images.`,
				{ itemIndex: index },
			);
		}
		const buffer = await this.helpers.getBinaryDataBuffer(index, name);
		if (buffer.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				`Binary field "${name}" is empty (0 bytes); Create Response needs the image's content.`,
				{ itemIndex: index },
			);
		}
		if (buffer.length > MAX_IMAGE_BYTES) {
			throw new NodeOperationError(
				this.getNode(),
				`Image "${meta.fileName ?? name}" is ${megabytes(buffer.length)} MB; oneAI accepts at most ${megabytes(MAX_IMAGE_BYTES)} MB per image.`,
				{ itemIndex: index },
			);
		}
		totalBytes += buffer.length;
		images.push({
			contentType: mimeType,
			data: buffer.toString('base64'),
			...(meta.fileName ? { filename: meta.fileName.slice(0, MAX_FILENAME_LENGTH) } : {}),
		});
	}
	if (totalBytes > MAX_IMAGES_TOTAL_BYTES) {
		throw new NodeOperationError(
			this.getNode(),
			`The images add up to ${megabytes(totalBytes)} MB; oneAI accepts at most ${megabytes(MAX_IMAGES_TOTAL_BYTES)} MB per message.`,
			{ itemIndex: index },
		);
	}
	return images;
}

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('model', index) as string;
	const inputMode = this.getNodeParameter('inputMode', index) as string;
	const associateChat = this.getNodeParameter('associateChat', index, false) as boolean;
	const addImages = this.getNodeParameter('addImages', index, false) as boolean;

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

	// Read before a chat is created, so an image that is refused leaves no empty chat behind.
	const images = addImages ? await readImages.call(this, index) : undefined;

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

	// Only sent when Add Images is on, so a text-only call keeps today's body exactly and still
	// works against a oneAI that does not know the field.
	if (images) {
		body.images = images;
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
