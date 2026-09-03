import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestAllItems } from '../../transport';
import type { ListRowsResponse, TableRow } from './helpers';

/**
 * `GET /api/spaces/{spaceId}/tables/{tableName}/rows`. `pageSize` is REQUIRED by the spec and
 * capped at 500; `page` is 0-based and optional.
 *
 * The API returns `{ rows: [{ id, data }], totalCount }` and there is no `hasNextPage` - measured
 * live - so `oneAiApiRequestAllItems` terminates on its `totalCount` branch.
 *
 * Simplify (on by default) lifts the row's own columns to the top level and renames `id` to
 * `rowId`. Without it every downstream expression would read `{{ $json.data.customer_name }}`,
 * which is unlike Airtable, Baserow, NocoDB and Google Sheets and makes pulling a dataset into
 * another app tedious. `rowId` rather than `id` because `id` is a plausible user column name and
 * would collide the moment the row is flattened.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space holding the dataset',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['list'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the dataset to read rows from',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['list'],
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
				resource: ['datasetRow'],
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
			maxValue: 500,
		},
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['list'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Simplify',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
		],
	},
];

function simplifyRow(row: TableRow): IDataObject {
	// A literal `rowId` column in the table loses to the row id here; `simplify: false` recovers it.
	return { ...row.data, rowId: row.id };
}

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const tableName = this.getNodeParameter('tableName', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const options = this.getNodeParameter('options', index) as { simplify?: boolean };
	const simplify = options.simplify !== false;

	let rows: TableRow[];

	if (returnAll) {
		rows = (await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}/rows`,
			itemsKey: 'rows',
		})) as TableRow[];
	} else {
		const limit = this.getNodeParameter('limit', index) as number;
		const response = (await oneAiApiRequest.call(this, {
			method: 'GET',
			endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}/rows`,
			qs: { page: 0, pageSize: limit },
		})) as ListRowsResponse;
		rows = Array.isArray(response.rows) ? response.rows : [];
	}

	const output = simplify ? rows.map(simplifyRow) : rows;

	return this.helpers.returnJsonArray(output).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
