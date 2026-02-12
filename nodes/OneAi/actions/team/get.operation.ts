import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the team to retrieve',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['get'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const teamId = this.getNodeParameter('teamId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/teams/${teamId}`,
	});

	return this.helpers.returnJsonArray(response);
}
