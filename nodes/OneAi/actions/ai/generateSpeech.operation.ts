import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { oneAiApiRequestRaw } from '../../transport';

/**
 * The gateway only synthesizes raw PCM: 24 kHz, 16-bit signed little-endian,
 * mono. There is no container (no WAV/MP3 header), so downstream nodes that
 * expect a playable file must wrap or convert it first.
 */
const OUTPUT_MIME_TYPE = 'audio/pcm';
const OUTPUT_FILE_NAME = 'speech.pcm';

export const description: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'input',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		description: 'The text to synthesize into speech',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['generateSpeech'],
			},
		},
	},
	{
		displayName: 'Voice',
		name: 'voice',
		type: 'options',
		options: [
			{ name: 'Alloy', value: 'alloy' },
			{ name: 'Ash', value: 'ash' },
			{ name: 'Ballad', value: 'ballad' },
			{ name: 'Coral', value: 'coral' },
			{ name: 'Echo', value: 'echo' },
			{ name: 'Fable', value: 'fable' },
			{ name: 'Nova', value: 'nova' },
			{ name: 'Onyx', value: 'onyx' },
			{ name: 'Sage', value: 'sage' },
			{ name: 'Shimmer', value: 'shimmer' },
		],
		default: 'alloy',
		description: 'The voice to speak with',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['generateSpeech'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The binary property name to write the synthesized audio to',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['generateSpeech'],
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
				operation: ['generateSpeech'],
			},
		},
		options: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: 'gpt-4o-mini-tts',
				description:
					'The text-to-speech model to use. Supported models depend on your OneAI instance.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const input = this.getNodeParameter('input', index) as string;
	const voice = this.getNodeParameter('voice', index) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as {
		model?: string;
	};

	const body: IDataObject = {
		model: additionalOptions.model || 'gpt-4o-mini-tts',
		voice,
		input,
		response_format: 'pcm',
	};

	const audio = await oneAiApiRequestRaw.call(this, {
		method: 'POST',
		endpoint: '/api/openai/v1/audio/speech',
		body,
	});

	const binaryData = await this.helpers.prepareBinaryData(
		audio,
		OUTPUT_FILE_NAME,
		OUTPUT_MIME_TYPE,
	);

	return [
		{
			json: {
				model: body.model,
				voice,
				format: 'pcm',
				sampleRate: 24000,
				bitDepth: 16,
				channels: 1,
			},
			binary: { [binaryPropertyName]: binaryData },
			pairedItem: { item: index },
		},
	];
}
