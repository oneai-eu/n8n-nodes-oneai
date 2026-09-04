import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestAllItems } from '../../transport';

/**
 * `GET /api/spaces/{spaceId}/files` requires `pageSize`. This operation passed no query string
 * at all, so the call was rejected - another failure a path-level check cannot see, because
 * the path is still exactly right.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['listFiles'],
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
				resource: ['space'],
				operation: ['listFiles'],
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
			maxValue: 500,
		},
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['listFiles'],
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
				operation: ['listFiles'],
			},
		},
		options: [
			{
				displayName: 'Embedding Status',
				name: 'embeddingStatus',
				type: 'options',
				default: 'done',
				description: 'Filter files by embedding status',
				options: [
					{ name: 'Bad Type', value: 'badType' },
					{ name: 'Done', value: 'done' },
					{ name: 'Error', value: 'error' },
					{ name: 'Not Embedded', value: 'notEmbedded' },
					{ name: 'Pattern Excluded', value: 'patternExcluded' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Too Large', value: 'tooLarge' },
				],
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search term to filter files by path',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const filters = this.getNodeParameter('filters', index) as {
		search?: string;
		embeddingStatus?: string;
	};

	const qs: {
		search?: string;
		embeddingStatus?: string;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.search) {
		qs.search = filters.search;
	}
	if (filters.embeddingStatus) {
		qs.embeddingStatus = filters.embeddingStatus;
	}

	if (returnAll) {
		const files = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/files`,
			qs,
			itemsKey: 'files',
		});
		return this.helpers.returnJsonArray(files).map((item) => ({
			...item,
			pairedItem: { item: index },
		}));
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/files`,
		qs,
	});

	const files = (response.files as IDataObject[]) || [];
	return this.helpers.returnJsonArray(files).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
