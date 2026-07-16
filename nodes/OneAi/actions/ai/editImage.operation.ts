import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { oneAiApiRequest } from '../../transport';

interface ImageEditResponse {
	data: Array<{ b64_json: string; revised_prompt?: string }>;
	usage?: { input_tokens: number; output_tokens: number };
}

const OUTPUT_FORMAT_TO_MIME: Record<string, string> = {
	png: 'image/png',
	webp: 'image/webp',
	jpeg: 'image/jpeg',
};

/** Map an input binary's MIME type to a value the gateway accepts. */
function resolveSourceMimeType(mimeType: string | undefined): string | undefined {
	const value = (mimeType ?? '').toLowerCase();
	if (value.includes('png')) return 'image/png';
	if (value.includes('webp')) return 'image/webp';
	if (value.includes('jpeg') || value.includes('jpg')) return 'image/jpeg';
	return undefined;
}

export const description: INodeProperties[] = [
	{
		displayName: 'Input Image Binary Property',
		name: 'inputBinaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'The name of the binary property containing the source image to edit (PNG, JPEG, or WebP)',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['editImage'],
			},
		},
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		description: 'The text description of the edit to apply. Up to 32000 characters.',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['editImage'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The binary property name to write each edited image to',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['editImage'],
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
				operation: ['editImage'],
			},
		},
		options: [
			{
				displayName: 'Input Fidelity',
				name: 'inputFidelity',
				type: 'options',
				options: [
					{ name: 'High', value: 'high' },
					{ name: 'Low', value: 'low' },
				],
				default: 'low',
				description:
					'How closely the edit preserves the source image. Not supported by gpt-image-1-mini.',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{ name: 'GPT Image 1', value: 'gpt-image-1' },
					{ name: 'GPT Image 1 Mini', value: 'gpt-image-1-mini' },
					{ name: 'GPT Image 1.5', value: 'gpt-image-1.5' },
				],
				default: 'gpt-image-1.5',
				description: 'The image model to use for editing',
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
				description: 'How many images to generate (1-10)',
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
				default: 'webp',
				description: 'Output image format',
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
				description: 'Image quality',
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
				description: 'Output image size or aspect ratio',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const inputBinaryPropertyName = this.getNodeParameter(
		'inputBinaryPropertyName',
		index,
	) as string;
	const prompt = this.getNodeParameter('prompt', index) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as {
		model?: string;
		size?: string;
		quality?: string;
		outputFormat?: string;
		n?: number;
		inputFidelity?: string;
	};

	const sourceMeta = this.helpers.assertBinaryData(index, inputBinaryPropertyName);
	const imageMimeType = resolveSourceMimeType(sourceMeta.mimeType);
	if (!imageMimeType) {
		throw new NodeOperationError(
			this.getNode(),
			`Unsupported source image type "${sourceMeta.mimeType ?? 'unknown'}". Provide a PNG, JPEG, or WebP image.`,
			{ itemIndex: index },
		);
	}
	const sourceBuffer = await this.helpers.getBinaryDataBuffer(index, inputBinaryPropertyName);

	const body: IDataObject = {
		prompt,
		image_b64: sourceBuffer.toString('base64'),
		image_mime_type: imageMimeType,
	};
	if (additionalOptions.model) {
		body.model = additionalOptions.model;
	}
	if (additionalOptions.size) {
		body.size = additionalOptions.size;
	}
	if (additionalOptions.quality) {
		body.quality = additionalOptions.quality;
	}
	if (additionalOptions.outputFormat) {
		body.output_format = additionalOptions.outputFormat;
	}
	if (additionalOptions.n !== undefined) {
		body.n = additionalOptions.n;
	}
	if (additionalOptions.inputFidelity) {
		body.input_fidelity = additionalOptions.inputFidelity;
	}

	const response = (await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/openai/v1/images/edits',
		body,
	})) as unknown as ImageEditResponse;

	const images = response.data ?? [];
	if (images.length === 0) {
		throw new NodeOperationError(this.getNode(), 'No image was returned by the API.', {
			itemIndex: index,
		});
	}

	const effectiveFormat = (additionalOptions.outputFormat ?? 'webp').toLowerCase();
	const mimeType = OUTPUT_FORMAT_TO_MIME[effectiveFormat] ?? 'application/octet-stream';

	const items: INodeExecutionData[] = [];
	for (let i = 0; i < images.length; i++) {
		const { b64_json, revised_prompt } = images[i];
		const buffer = Buffer.from(b64_json, 'base64');
		const fileName = `image-${i + 1}.${effectiveFormat}`;
		const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, mimeType);
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
