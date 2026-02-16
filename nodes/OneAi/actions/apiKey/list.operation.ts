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
				resource: ['apiKey'],
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
			maxValue: 30,
		},
		displayOptions: {
			show: {
				resource: ['apiKey'],
				operation: ['list'],
				returnAll: [false],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;

	if (returnAll) {
		const apiKeys = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/keys',
			itemsKey: 'apiKeys',
			paginationKey: 'pagination',
		});
		return this.helpers.returnJsonArray(apiKeys);
	}

	const limit = this.getNodeParameter('limit', index) as number;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/keys',
		qs: {
			pageSize: limit,
			page: 0,
		},
	});

	const apiKeys = (response.apiKeys as IDataObject[]) || [];
	return this.helpers.returnJsonArray(apiKeys);
}
