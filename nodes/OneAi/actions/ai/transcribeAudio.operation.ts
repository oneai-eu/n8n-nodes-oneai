import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { oneAiApiRequest } from '../../transport';

interface TranscribeResponse {
	text: string;
}

export const description: INodeProperties[] = [
	{
		displayName: 'Input Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'The name of the binary property on the input item that contains the audio file',
		displayOptions: {
			show: {
				resource: ['ai'],
				operation: ['transcribeAudio'],
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
				operation: ['transcribeAudio'],
			},
		},
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'en',
				description:
					'ISO-639-1 language code of the audio (e.g. "en", "de"). Omit to let the model auto-detect.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as {
		language?: string;
	};

	const binaryBuffer = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);
	const audioBase64 = binaryBuffer.toString('base64');

	const qs: IDataObject = {};
	if (additionalOptions.language) {
		qs.language = additionalOptions.language;
	}

	const response = (await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/transcribe',
		body: { audio: audioBase64 },
		qs,
	})) as unknown as TranscribeResponse;

	return [
		{
			json: {
				text: response.text,
				language: additionalOptions.language ?? null,
			},
			pairedItem: { item: index },
		},
	];
}
