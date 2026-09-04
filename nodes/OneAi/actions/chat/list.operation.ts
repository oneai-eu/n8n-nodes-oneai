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
				displayName: 'Own Only',
				name: 'ownOnly',
				type: 'boolean',
				default: false,
				description: 'Whether to return only chats owned by the authenticated user',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description:
					'Search term. Matches chat names as a substring and message contents as full text; supports quoted phrases and OR.',
			},
			{
				displayName: 'Space ID',
				name: 'spaceId',
				type: 'string',
				default: '',
				description: 'Filter chats by space ID',
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
		spaceId?: string;
		search?: string;
		ownOnly?: boolean;
	};

	// `GET /api/chats` filters by `spaceId`. It used to be sent `projectId`, which is not a
	// parameter the endpoint defines - unknown query parameters are ignored rather than
	// rejected, so the filter silently returned every chat instead of failing.
	const qs: {
		spaceId?: string;
		search?: string;
		ownOnly?: boolean;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.spaceId) {
		qs.spaceId = filters.spaceId;
	}
	if (filters.search) {
		qs.search = filters.search;
	}
	if (filters.ownOnly) {
		qs.ownOnly = filters.ownOnly;
	}

	if (returnAll) {
		const chats = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/chats',
			qs,
			itemsKey: 'chats',
		});
		return this.helpers.returnJsonArray(chats).map((item) => ({
			...item,
			pairedItem: { item: index },
		}));
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
	return this.helpers.returnJsonArray(chats).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
