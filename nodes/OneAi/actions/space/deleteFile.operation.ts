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
				operation: ['deleteFile'],
			},
		},
	},
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'The path of the file to delete',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['deleteFile'],
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

	const response = await oneAiApiRequest.call(this, {
		method: 'DELETE',
		endpoint: `/api/spaces/${spaceId}/files/delete`,
		qs: {
			path,
		},
	});

	return this.helpers.returnJsonArray(response);
}
