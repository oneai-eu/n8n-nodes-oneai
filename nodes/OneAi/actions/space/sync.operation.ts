import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space to synchronize',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['sync'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${spaceId}/sync`,
	});

	return this.helpers.returnJsonArray(response);
}
