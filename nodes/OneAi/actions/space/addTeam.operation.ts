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
				operation: ['addTeam'],
			},
		},
	},
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the team to add',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['addTeam'],
			},
		},
	},
	{
		displayName: 'Can Write',
		name: 'canWrite',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the team can write to the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['addTeam'],
			},
		},
	},
	{
		displayName: 'Is Space Admin',
		name: 'isSpaceAdmin',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the team has admin privileges for this space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['addTeam'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const teamId = this.getNodeParameter('teamId', index) as string;
	const canWrite = this.getNodeParameter('canWrite', index) as boolean;
	const isSpaceAdmin = this.getNodeParameter('isSpaceAdmin', index) as boolean;

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${spaceId}/teams/add`,
		body: {
			teamId,
			canWrite,
			isSpaceAdmin,
		},
	});

	return this.helpers.returnJsonArray(response);
}
