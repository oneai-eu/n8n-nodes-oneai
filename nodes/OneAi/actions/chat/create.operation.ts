import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * Chats belong to a SPACE, not to a project. `POST /api/chats` requires `{ name, spaceId }`
 * and its schema is `additionalProperties: false`, so the `projectId` this operation used to
 * send was rejected outright. The URL never changed, which is why every path-level check on
 * this node stayed green while the call could not succeed.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space to create the chat in',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				description: 'Agent to use for this chat. Mutually exclusive with the persona ID.',
			},
			{
				displayName: 'Persona ID',
				name: 'personaId',
				type: 'string',
				default: '',
				description: 'Persona to use for this chat. Mutually exclusive with the agent ID.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const name = this.getNodeParameter('name', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as {
		agentId?: string;
		personaId?: string;
	};

	const body: {
		name: string;
		spaceId: string;
		origin: string;
		personaId?: string;
		agentId?: string;
	} = {
		name,
		spaceId,
		// The schema documents `n8n` as one of the sources a chat can be created from, so say so
		// rather than letting it default to `web`. It is how OneAI attributes a chat to this node.
		origin: 'n8n',
	};

	if (additionalFields.agentId) {
		body.agentId = additionalFields.agentId;
	}
	if (additionalFields.personaId) {
		body.personaId = additionalFields.personaId;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/chats',
		body,
	});

	return this.helpers.returnJsonArray(response).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
