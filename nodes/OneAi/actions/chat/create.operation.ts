import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project to create the chat in',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the chat',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['create'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const projectId = this.getNodeParameter('projectId', index) as string;
	const name = this.getNodeParameter('name', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/chats',
		body: {
			projectId,
			name,
		},
	});

	return this.helpers.returnJsonArray(response);
}
