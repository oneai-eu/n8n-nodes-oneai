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
				resource: ['auditLog'],
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
				resource: ['auditLog'],
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
				resource: ['auditLog'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'options',
				options: [
					{
						name: 'OneGateway: Compliance',
						value: 'onegateway:compliance',
					},
					{
						name: 'OneGateway: Pattern',
						value: 'onegateway:pattern',
					},
				],
				default: 'onegateway:pattern',
				description: 'Filter by origin type',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'Filter by specific user ID (admin only)',
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
		origin?: string;
		userId?: string;
	};

	const qs: {
		origin?: string;
		userId?: string;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.origin) {
		qs.origin = filters.origin;
	}

	if (filters.userId) {
		qs.userId = filters.userId;
	}

	if (returnAll) {
		const logs = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/audit/logs',
			qs,
			itemsKey: 'logs',
			paginationKey: 'pagination',
		});
		return this.helpers.returnJsonArray(logs);
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/audit/logs',
		qs,
	});

	const logs = (response.logs as IDataObject[]) || [];
	return this.helpers.returnJsonArray(logs);
}
