import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the member to update',
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Is Admin',
		name: 'isAdmin',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the member should have admin privileges',
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['update'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const userId = this.getNodeParameter('userId', index) as string;
	const isAdmin = this.getNodeParameter('isAdmin', index) as boolean;

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/members/${userId}`,
		body: {
			isAdmin,
		},
	});

	return this.helpers.returnJsonArray(response);
}
