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
				operation: ['addUser'],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the user to add',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['addUser'],
			},
		},
	},
	{
		displayName: 'Can Write',
		name: 'canWrite',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the user can write to the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['addUser'],
			},
		},
	},
	{
		displayName: 'Is Space Admin',
		name: 'isSpaceAdmin',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the user has admin privileges for this space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['addUser'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const userId = this.getNodeParameter('userId', index) as string;
	const canWrite = this.getNodeParameter('canWrite', index) as boolean;
	const isSpaceAdmin = this.getNodeParameter('isSpaceAdmin', index) as boolean;

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${spaceId}/users/add`,
		body: {
			userId,
			canWrite,
			isSpaceAdmin,
		},
	});

	return this.helpers.returnJsonArray(response);
}
