import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['list'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['list'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search by team name (case-insensitive)',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const filters = this.getNodeParameter('filters', index) as {
		search?: string;
	};

	const qs: {
		search?: string;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.search) {
		qs.search = filters.search;
	}

	if (returnAll) {
		const teams = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/teams',
			qs,
			itemsKey: 'teams',
		});
		return this.helpers.returnJsonArray(teams);
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/teams',
		qs,
	});

	const teams = (response.teams as IDataObject[]) || [];
	return this.helpers.returnJsonArray(teams);
}
