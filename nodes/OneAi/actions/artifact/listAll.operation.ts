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
				resource: ['artifact'],
				operation: ['listAll'],
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
				resource: ['artifact'],
				operation: ['listAll'],
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
				resource: ['artifact'],
				operation: ['listAll'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search term to filter artifacts by name or space name',
			},
			{
				displayName: 'Space ID',
				name: 'spaceId',
				type: 'string',
				default: '',
				description: 'Filter artifacts by space ID',
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
		spaceId?: string;
	};

	const qs: {
		search?: string;
		spaceId?: string;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.search) {
		qs.search = filters.search;
	}
	if (filters.spaceId) {
		qs.spaceId = filters.spaceId;
	}

	if (returnAll) {
		const artifacts = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/spaces/artifacts',
			qs,
			itemsKey: 'artifacts',
		});
		return this.helpers.returnJsonArray(artifacts);
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/spaces/artifacts',
		qs,
	});

	const artifacts = (response.artifacts as IDataObject[]) || [];
	return this.helpers.returnJsonArray(artifacts);
}
