import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['downloadFile'],
			},
		},
	},
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'The path of the file to download',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['downloadFile'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['downloadFile'],
			},
		},
		options: [
			{
				displayName: 'Convert',
				name: 'convert',
				type: 'boolean',
				default: false,
				description: 'Whether to convert to browser-compatible format if possible',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const path = this.getNodeParameter('path', index) as string;
	const options = this.getNodeParameter('options', index) as {
		convert?: boolean;
	};

	const qs: {
		path: string;
		convert?: boolean;
	} = {
		path,
	};

	if (options.convert !== undefined) {
		qs.convert = options.convert;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${spaceId}/files/download`,
		qs,
	});

	return this.helpers.returnJsonArray(response);
}
