import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { oneAiApiRequest } from '../../transport';

interface ImageGenerationResponse {
	data: Array<{ b64_json: string; revised_prompt?: string }>;
	usage?: { input_tokens: number; output_tokens: number };
}

const OUTPUT_FORMAT_TO_MIME: Record<string, string> = {
	png: 'image/png',
	webp: 'image/webp',
	jpeg: 'image/jpeg',
};

export const description: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		description: 'The text description of the image to generate. Up to 32000 characters.',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['generateImage'],
			},
		},
	},
	{
		displayName: 'Image Model Name or ID',
		name: 'model',
		type: 'options',
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getImageModels',
		},
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['generateImage'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The binary property name to write each generated image to',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['generateImage'],
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
				operation: ['generateImage'],
			},
		},
		options: [
			{
				displayName: 'Background',
				name: 'background',
				type: 'options',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'Opaque', value: 'opaque' },
					{ name: 'Transparent', value: 'transparent' },
				],
				default: 'auto',
				description:
					'Background handling. Only applied by models that support it (see "supportsBackground" on the model).',
			},
			{
				displayName: 'Number of Images',
				name: 'n',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				default: 1,
				description:
					'How many images to generate (1-10). Imagen models support at most 4.',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				options: [
					{ name: 'JPEG', value: 'jpeg' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				default: 'png',
				description:
					'Output image format. Only applied by models that support it (see "supportsOutputFormat" on the model). Imagen always returns PNG.',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'options',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'High', value: 'high' },
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
				],
				default: 'auto',
				description: 'Image quality. Only applied by GPT-Image models; ignored by Imagen.',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'options',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'Landscape (1536×1024)', value: '1536x1024' },
					{ name: 'Landscape (16:9)', value: '16:9' },
					{ name: 'Landscape (4:3)', value: '4:3' },
					{ name: 'Portrait (1024×1536)', value: '1024x1536' },
					{ name: 'Portrait (3:4)', value: '3:4' },
					{ name: 'Portrait (9:16)', value: '9:16' },
					{ name: 'Square (1:1)', value: '1:1' },
					{ name: 'Square (1024×1024)', value: '1024x1024' },
				],
				default: 'auto',
				description:
					'Image size or aspect ratio. Supported values depend on the model — see the list of image models for what each one accepts.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const prompt = this.getNodeParameter('prompt', index) as string;
	const model = this.getNodeParameter('model', index, '') as string;
	const binaryPropertyName = this.getNodeParameter(
		'binaryPropertyName',
		index,
	) as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as {
		n?: number;
		size?: string;
		quality?: string;
		background?: string;
		outputFormat?: string;
	};

	const body: IDataObject = { prompt };
	if (model) {
		body.model = model;
	}
	if (additionalOptions.n !== undefined) {
		body.n = additionalOptions.n;
	}
	if (additionalOptions.size) {
		body.size = additionalOptions.size;
	}
	if (additionalOptions.quality) {
		body.quality = additionalOptions.quality;
	}
	if (additionalOptions.background) {
		body.background = additionalOptions.background;
	}
	if (additionalOptions.outputFormat) {
		body.output_format = additionalOptions.outputFormat;
	}

	const response = (await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/openai/v1/images/generations',
		body,
	})) as unknown as ImageGenerationResponse;

	const images = response.data ?? [];
	if (images.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No image was returned by the API.', {
			itemIndex: index,
		});
	}

	const isImagen = (body.model as string | undefined)?.startsWith('imagen-') ?? false;
	const requestedFormat = (additionalOptions.outputFormat ?? '').toLowerCase();
	const effectiveFormat = isImagen
		? 'png'
		: requestedFormat || 'webp';
	const mimeType = OUTPUT_FORMAT_TO_MIME[effectiveFormat] ?? 'application/octet-stream';

	const items: INodeExecutionData[] = [];
	for (let i = 0; i < images.length; i++) {
		const { b64_json, revised_prompt } = images[i];
		const buffer = Buffer.from(b64_json, 'base64');
		const fileName = `image-${i + 1}.${effectiveFormat}`;
		const binaryData = await this.helpers.prepareBinaryData(
			buffer,
			fileName,
			mimeType,
		);
		items.push({
			json: {
				prompt,
				model: (body.model as string | undefined) ?? null,
				revisedPrompt: revised_prompt,
				imageIndex: i,
				imageCount: images.length,
				mimeType,
				usage: response.usage,
			},
			binary: { [binaryPropertyName]: binaryData },
			pairedItem: { item: index },
		});
	}

	return items;
}
