import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Start date for the usage statistics period',
		displayOptions: {
			show: {
				resource: ['stats'],
				operation: ['usage'],
			},
		},
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'End date for the usage statistics period',
		displayOptions: {
			show: {
				resource: ['stats'],
				operation: ['usage'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['stats'],
				operation: ['usage'],
			},
		},
		options: [
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'Filter usage stats for a specific user',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const startDate = this.getNodeParameter('startDate', index) as string;
	const endDate = this.getNodeParameter('endDate', index) as string;
	const options = this.getNodeParameter('options', index) as {
		userId?: string;
	};

	const qs: {
		startDate: string;
		endDate: string;
		userId?: string;
	} = {
		startDate,
		endDate,
	};

	if (options.userId) {
		qs.userId = options.userId;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/stats/usage',
		qs,
	});

	return this.helpers.returnJsonArray(response);
}
