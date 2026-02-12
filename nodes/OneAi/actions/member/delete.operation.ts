import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the member to delete',
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['delete'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const userId = this.getNodeParameter('userId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'DELETE',
		endpoint: `/api/members/${userId}`,
	});

	return this.helpers.returnJsonArray(response);
}
