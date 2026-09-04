import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestAllItems } from '../../transport';
import { readSpaceId, readSpaces, type DatasetSpace } from './helpers';

/**
 * `GET /api/spaces` with `provider=oneData` pinned - and the pin IS the operation.
 *
 * Every other dataset operation needs a `Space ID` the author must already possess, and nothing
 * on this resource told them where to get one. `space:list` can be filtered to `oneData`, but
 * only by someone who already knows that a dataset lives in a space of that provider; that is an
 * internal concept of the platform, and removing the need for it is what a node is for. So the
 * provider is not exposed as a parameter here: an author who wants the other providers wants
 * `space:list`.
 *
 * The response is `{ spaces, totalCount }` with no `hasNextPage` (spec and live agree), so
 * `oneAiApiRequestAllItems` terminates on its `totalCount` branch - the same situation
 * `datasetRow:list` is in.
 *
 * One item per space, flattened, each carrying a top-level `spaceId`. The composition this
 * exists for is `listSpaces → dataset:list → datasetRow:append`, and the router's own item loop
 * is what fans the middle step out; nothing here builds a fan-out of its own.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['listSpaces'],
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
				resource: ['dataset'],
				operation: ['listSpaces'],
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
				resource: ['dataset'],
				operation: ['listSpaces'],
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
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const filters = this.getNodeParameter('filters', index) as { search?: string };

	// `provider` is fixed, never read from a parameter: it is the whole point of the operation.
	const qs: { provider: 'oneData'; search?: string; page?: number; pageSize?: number } = {
		provider: 'oneData',
	};

	if (filters.search) {
		qs.search = filters.search;
	}

	let spaces: DatasetSpace[];

	if (returnAll) {
		spaces = (await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/spaces',
			qs,
			itemsKey: 'spaces',
		})) as DatasetSpace[];
	} else {
		const limit = this.getNodeParameter('limit', index) as number;
		qs.page = 0;
		qs.pageSize = limit;

		const response = await oneAiApiRequest.call(this, {
			method: 'GET',
			endpoint: '/api/spaces',
			qs,
		});
		spaces = readSpaces(response);
	}

	const output = spaces.map((space) => ({ ...space, spaceId: readSpaceId(space) }));

	return this.helpers.returnJsonArray(output).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
