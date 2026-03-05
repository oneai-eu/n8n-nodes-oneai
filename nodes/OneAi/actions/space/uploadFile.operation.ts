import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestBinary } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space to upload the file to',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['uploadFile'],
			},
		},
	},
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/documents/report.pdf',
		description: 'The destination path for the file in the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['uploadFile'],
			},
		},
	},
	{
		displayName: 'Auto Embed',
		name: 'autoEmbed',
		type: 'boolean',
		default: false,
		description: 'Whether to automatically queue the uploaded file for embedding after upload',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['uploadFile'],
			},
		},
	},
	{
		displayName: 'Replace',
		name: 'replace',
		type: 'boolean',
		default: false,
		description: 'Whether to replace an existing file at the same path',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['uploadFile'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		description: 'The name of the binary property containing the file to upload',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['uploadFile'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const path = this.getNodeParameter('path', index) as string;
	const replace = this.getNodeParameter('replace', index) as boolean;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const autoEmbed = this.getNodeParameter('autoEmbed', index) as boolean;

	const binaryData = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);

	const response = await oneAiApiRequestBinary.call(this, {
		method: 'PUT',
		endpoint: `/api/spaces/${spaceId}/files/upload`,
		body: binaryData,
		qs: {
			path,
			replace,
		},
	});

	const result: IDataObject = {
		success: true,
		spaceId,
		path,
		...response,
	};

	if (autoEmbed) {
		const embedResponse = await oneAiApiRequest.call(this, {
			method: 'POST',
			endpoint: `/api/spaces/${spaceId}/files/embed`,
			body: {
				paths: [path],
			},
		});
		result.embed = embedResponse;
	}

	return [
		{
			json: result,
			pairedItem: { item: index },
		},
	];
}
