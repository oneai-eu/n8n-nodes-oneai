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
				operation: ['embedFiles'],
			},
		},
	},
	{
		displayName: 'Paths',
		name: 'paths',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated list of file or folder paths to embed',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['embedFiles'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const pathsString = this.getNodeParameter('paths', index) as string;
	const paths = pathsString.split(',').map((p) => p.trim());

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${spaceId}/files/embed`,
		body: {
			paths,
		},
	});

	return this.helpers.returnJsonArray(response);
}
