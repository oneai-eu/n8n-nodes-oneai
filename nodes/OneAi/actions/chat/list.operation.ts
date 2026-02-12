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
				resource: ['chat'],
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
				resource: ['chat'],
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
				resource: ['chat'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				description: 'Filter chats by project ID',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search term to filter chats by name or project name',
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
		projectId?: string;
		search?: string;
	};

	const qs: {
		projectId?: string;
		search?: string;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.projectId) {
		qs.projectId = filters.projectId;
	}
	if (filters.search) {
		qs.search = filters.search;
	}

	if (returnAll) {
		const chats = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/chats',
			qs,
			itemsKey: 'chats',
		});
		return this.helpers.returnJsonArray(chats);
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/chats',
		qs,
	});

	const chats = (response.chats as IDataObject[]) || [];
	return this.helpers.returnJsonArray(chats);
}
