import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { oneAiApiRequestStream } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		default: 'gpt-5-nano',
		description: 'The model to use for generating the response',
		displayOptions: {
			show: {
				resource: ['openai'],
				operation: ['createResponse'],
			},
		},
		options: [
			{
				name: 'Gemini 2.5 Flash',
				value: 'gemini-2.5-flash',
				description: 'Google\'s best model in terms of performance, offering well-rounded capabilities',
			},
			{
				name: 'Gemini 2.5 Flash Lite',
				value: 'gemini-2.5-flash-lite',
				description: 'Google\'s most cost-effective model that supports high throughput tasks',
			},
			{
				name: 'Gemini 3 Pro',
				value: 'gemini-3-pro-preview',
				description: 'Google\'s most powerful agentic and vibe-coding model yet',
			},
			{
				name: 'GPT-5 Mini',
				value: 'gpt-5-mini',
				description: 'Faster, more cost-efficient version of GPT-5, great for well-defined tasks and precise prompts. Created by OpenAI.',
			},
			{
				name: 'GPT-5 Nano',
				value: 'gpt-5-nano',
				description: 'Fastest, cheapest version of GPT-5, great for summarization and classification. Created by OpenAI.',
			},
			{
				name: 'GPT-5.1',
				value: 'gpt-5.1',
				description: 'Previous flagship model for coding, reasoning, and agentic tasks. Created by OpenAI.',
			},
			{
				name: 'GPT-5.2',
				value: 'gpt-5.2',
				description: 'Flagship model for coding, reasoning, and agentic tasks. Created by OpenAI.',
			},
			{
				name: 'Haiku 4.5',
				value: 'claude-haiku-4-5',
				description: 'Anthropic\'s fastest model with near-frontier intelligence',
			},
			{
				name: 'Magistral Medium',
				value: 'magistral-medium-latest',
				description: 'Mistral\'s frontier-class reasoning model',
			},
			{
				name: 'Magistral Small',
				value: 'magistral-small-latest',
				description: 'Mistral\'s small reasoning model, suitable for tasks requiring basic reasoning',
			},
			{
				name: 'Mistral Large',
				value: 'mistral-large-latest',
				description: 'Mistral\'s large model for complex tasks and applications',
			},
			{
				name: 'Mistral Medium',
				value: 'mistral-medium-latest',
				description: 'Mistral\'s frontier-class model for general-purpose use cases',
			},
			{
				name: 'Mistral Small',
				value: 'mistral-small-latest',
				description: 'Mistral\'s small model, suitable for basic tasks and lightweight applications',
			},
			{
				name: 'Opus 4.5',
				value: 'claude-opus-4-5',
				description: 'Anthropic\'s premium model combining maximum intelligence with practical performance',
			},
			{
				name: 'Sonnet 4.5',
				value: 'claude-sonnet-4-5',
				description: 'Anthropic\'s smartest model for complex agents and coding',
			},
		],
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
				resource: ['openai'],
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
				resource: ['openai'],
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
				resource: ['openai'],
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
				resource: ['openai'],
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
					{ name: 'Minimal', value: 'minimal' },
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
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('model', index) as string;
	const inputMode = this.getNodeParameter('inputMode', index) as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', index) as {
		temperature?: number;
		reasoningEffort?: string;
		reasoningSummary?: string;
		tools?: string;
	};

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

	const body: IDataObject = {
		model,
		input,
		stream: true,
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

	const response = await oneAiApiRequestStream.call(this, {
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
