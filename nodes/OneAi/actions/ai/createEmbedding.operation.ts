import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { oneAiApiRequest } from '../../transport';

interface EmbeddingResponse {
	object: 'list';
	data: Array<{
		object: 'embedding';
		embedding: number[] | string;
		index: number;
	}>;
	model: string;
	usage: { prompt_tokens: number; total_tokens: number };
}

export const description: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		default: 'text-embedding-3-small',
		description:
			'The embedding model ID to use. Common values: text-embedding-3-small, text-embedding-3-large.',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createEmbedding'],
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
				name: 'Single Text',
				value: 'single',
				description: 'Embed a single piece of text',
			},
			{
				name: 'Multiple Texts',
				value: 'batch',
				description: 'Embed an array of texts in one request',
			},
		],
		default: 'single',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createEmbedding'],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		description: 'The text to embed',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createEmbedding'],
				inputMode: ['single'],
			},
		},
	},
	{
		displayName: 'Texts (JSON Array)',
		name: 'textsJson',
		type: 'json',
		required: true,
		default: '[\n  "first text",\n  "second text"\n]',
		description: 'JSON array of strings to embed',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['createEmbedding'],
				inputMode: ['batch'],
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
				operation: ['createEmbedding'],
			},
		},
		options: [
			{
				displayName: 'Encoding Format',
				name: 'encodingFormat',
				type: 'options',
				options: [
					{ name: 'Base64', value: 'base64' },
					{ name: 'Float', value: 'float' },
				],
				default: 'float',
				description: 'How embeddings are returned. Float = numeric array; base64 = compact encoded string.',
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
	const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as {
		encodingFormat?: string;
	};

	let input: string | string[];
	if (inputMode === 'single') {
		input = this.getNodeParameter('text', index) as string;
	} else {
		const raw = this.getNodeParameter('textsJson', index) as string;
		try {
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === 'string')) {
				throw new Error('Expected a JSON array of strings.');
			}
			input = parsed as string[];
		} catch (err) {
			throw new NodeOperationError(
				this.getNode(),
				`Texts must be a valid JSON array of strings: ${(err as Error).message}`,
				{ itemIndex: index },
			);
		}
	}

	const body: IDataObject = { model, input };
	if (additionalOptions.encodingFormat) {
		body.encoding_format = additionalOptions.encodingFormat;
	}

	const response = (await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/openai/v1/embeddings',
		body,
	})) as unknown as EmbeddingResponse;

	return [
		{
			json: {
				model: response.model,
				usage: response.usage,
				embeddings: response.data,
			},
			pairedItem: { item: index },
		},
	];
}
