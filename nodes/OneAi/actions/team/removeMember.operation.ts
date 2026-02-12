import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the team',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['removeMember'],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the user to remove from the team',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['removeMember'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const teamId = this.getNodeParameter('teamId', index) as string;
	const userId = this.getNodeParameter('userId', index) as string;

	await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/teams/${teamId}/members/remove`,
		body: { userId },
	});

	return this.helpers.returnJsonArray({ success: true });
}
