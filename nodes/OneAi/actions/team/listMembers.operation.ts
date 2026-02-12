import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestAllItems } from '../../transport';

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
				operation: ['listMembers'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['listMembers'],
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
				operation: ['listMembers'],
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
				operation: ['listMembers'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search by email (case-insensitive)',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const teamId = this.getNodeParameter('teamId', index) as string;
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
		const members = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: `/api/teams/${teamId}/members`,
			qs,
			itemsKey: 'members',
		});
		return this.helpers.returnJsonArray(members);
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/teams/${teamId}/members`,
		qs,
	});

	const members = (response.members as IDataObject[]) || [];
	return this.helpers.returnJsonArray(members);
}
