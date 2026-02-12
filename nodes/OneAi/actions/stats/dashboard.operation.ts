import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['stats'],
				operation: ['dashboard'],
			},
		},
		options: [
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'Get dashboard stats for a specific user (leave empty for organization overview)',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', index) as {
		userId?: string;
	};

	const qs: {
		userId?: string;
	} = {};

	if (options.userId) {
		qs.userId = options.userId;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/stats/dashboard',
		qs,
	});

	return this.helpers.returnJsonArray(response);
}
