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
				resource: ['space'],
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
				resource: ['space'],
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
				resource: ['space'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search by space name (case-insensitive)',
			},
			{
				displayName: 'Provider',
				name: 'provider',
				type: 'options',
				default: '',
				description: 'Filter by storage provider',
				options: [
					{
						name: 'All',
						value: '',
					},
					{
						name: 'Local',
						value: 'local',
					},
					{
						name: 'OneDrive',
						value: 'onedrive',
					},
					{
						name: 'SharePoint',
						value: 'sharepoint',
					},
					{
						name: 'Google Drive',
						value: 'google',
					},
					{
						name: 'GitHub',
						value: 'github',
					},
				],
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
		provider?: string;
	};

	const qs: {
		search?: string;
		provider?: string;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.search) {
		qs.search = filters.search;
	}
	if (filters.provider) {
		qs.provider = filters.provider;
	}

	if (returnAll) {
		const spaces = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/spaces',
			qs,
			itemsKey: 'spaces',
		});
		return this.helpers.returnJsonArray(spaces);
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/spaces',
		qs,
	});

	const spaces = (response.spaces as IDataObject[]) || [];
	return this.helpers.returnJsonArray(spaces);
}
