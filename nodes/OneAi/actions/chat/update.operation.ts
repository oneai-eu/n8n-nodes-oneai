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
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				description:
					'Agent to assign to this chat. Replaces any persona on the chat, and can only be changed before the first assistant response.',
			},
			{
				displayName: 'Current Branch ID',
				name: 'currentBranchId',
				type: 'string',
				default: '',
				description: 'Set the current branch ID',
			},
			{
				displayName: 'Persona ID',
				name: 'personaId',
				type: 'string',
				default: '',
				description:
					'Persona to assign to this chat. Can only be changed before the first assistant response.',
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
		currentBranchId?: string;
		personaId?: string;
		agentId?: string;
	};

	// `PUT /api/chats/{chatId}` is `additionalProperties: false` and no longer accepts
	// `projectId` - chats live in spaces now, and there is no "move to another project".
	const body: {
		name?: string;
		currentBranchId?: string;
		personaId?: string;
		agentId?: string;
	} = {};

	if (updateFields.name) {
		body.name = updateFields.name;
	}
	if (updateFields.currentBranchId) {
		body.currentBranchId = updateFields.currentBranchId;
	}
	if (updateFields.personaId) {
		body.personaId = updateFields.personaId;
	}
	if (updateFields.agentId) {
		body.agentId = updateFields.agentId;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/chats/${encodeURIComponent(chatId)}`,
		body,
	});

	return this.helpers.returnJsonArray(response).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
