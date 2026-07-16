import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
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
				resource: ['compliancePattern'],
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
				resource: ['compliancePattern'],
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
				resource: ['compliancePattern'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Pattern Type',
				name: 'filter',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Custom', value: 'custom' },
					{ name: 'Default', value: 'default' },
				],
				default: 'all',
				description: 'Whether to return default patterns, custom patterns, or both',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search patterns by title or description',
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
		filter?: string;
		search?: string;
	};

	const qs: IDataObject = {};
	if (filters.filter) {
		qs.filter = filters.filter;
	}
	if (filters.search) {
		qs.search = filters.search;
	}

	if (returnAll) {
		const patterns = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/compliance/pattern',
			qs,
			itemsKey: 'patterns',
			paginationKey: 'pagination',
		});
		return this.helpers.returnJsonArray(patterns).map((item, i) => ({
			...item,
			pairedItem: { item: i },
		}));
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/compliance/pattern',
		qs,
	});

	const patterns = (response.patterns as IDataObject[]) || [];
	return this.helpers.returnJsonArray(patterns).map((item, i) => ({
		...item,
		pairedItem: { item: i },
	}));
}
