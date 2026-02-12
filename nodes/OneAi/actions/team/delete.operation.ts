import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the team to delete',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['delete'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const teamId = this.getNodeParameter('teamId', index) as string;

	await oneAiApiRequest.call(this, {
		method: 'DELETE',
		endpoint: `/api/teams/${teamId}`,
	});

	return this.helpers.returnJsonArray({ success: true });
}
