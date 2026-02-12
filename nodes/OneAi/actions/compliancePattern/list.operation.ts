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
				displayName: 'Filter Type',
				name: 'filter',
				type: 'options',
				default: 'all',
				description: 'Filter patterns by type',
				options: [
					{
						name: 'All (Default + Custom)',
						value: 'all',
					},
					{
						name: 'Default Only',
						value: 'default',
					},
					{
						name: 'Custom Only',
						value: 'custom',
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
		filter?: string;
	};

	const qs: {
		filter?: string;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.filter) {
		qs.filter = filters.filter;
	}

	if (returnAll) {
		const patterns = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/compliance/pattern',
			qs,
			itemsKey: 'patterns',
		});
		return this.helpers.returnJsonArray(patterns);
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
	return this.helpers.returnJsonArray(patterns);
}
