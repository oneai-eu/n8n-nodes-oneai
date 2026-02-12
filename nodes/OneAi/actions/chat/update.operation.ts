import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the chat to update',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name for the chat',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				description: 'Move chat to a different project',
			},
			{
				displayName: 'Current Branch ID',
				name: 'currentBranchId',
				type: 'string',
				default: '',
				description: 'Set the current branch ID',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const chatId = this.getNodeParameter('chatId', index) as string;
	const updateFields = this.getNodeParameter('updateFields', index) as {
		name?: string;
		projectId?: string;
		currentBranchId?: string;
	};

	const body: {
		name?: string;
		projectId?: string;
		currentBranchId?: string;
	} = {};

	if (updateFields.name) {
		body.name = updateFields.name;
	}
	if (updateFields.projectId) {
		body.projectId = updateFields.projectId;
	}
	if (updateFields.currentBranchId) {
		body.currentBranchId = updateFields.currentBranchId;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/chats/${chatId}`,
		body,
	});

	return this.helpers.returnJsonArray(response);
}
