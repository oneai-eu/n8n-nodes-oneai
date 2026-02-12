import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the team',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['create'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/teams',
		body: { name },
	});

	return this.helpers.returnJsonArray(response);
}
