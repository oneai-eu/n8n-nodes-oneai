import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestBinary } from '../../transport';
import {
	readTables,
	requireTable,
	type ImportCsvResponse,
	type TableSummary,
} from '../dataset/helpers';
import {
	buildCsv,
	buildHeader,
	dataJsonProperty,
	dataModeProperty,
	ignoreFieldsOption,
	resolveRowData,
} from './helpers';

/**
 * 🔴 The one operation in this node that runs ONCE for the whole input rather than once per item.
 * `router.ts` dispatches it from an explicit arm placed before the item loop, and it is exported
 * as `executeAll` - not `execute` - so that the shape difference is visible in the source rather
 * than hidden behind a duck-typed check.
 *
 * It builds one RFC-4180 CSV from every input item and sends it to
 * `POST /api/spaces/{spaceId}/tables/{tableName}/import-csv`, whose request body is declared
 * `text/csv`. Ten thousand items cost one request instead of ten thousand.
 *
 * Three things it cannot do, and they are why this is a separate operation from `append` rather
 * than a Batching toggle on it - a toggle would change the output schema silently:
 *
 *   1. it returns no row ids. The import response is
 *      `{ tableId, created, inserted, version, totalRowCount }` and nothing else, so a workflow
 *      that needs to update or delete these rows later must use `append`;
 *   2. the import is one atomic transaction, so a single bad row rejects the whole file and
 *      per-item `continueOnFail` means nothing here;
 *   3. 🔴 every value travels through a CSV cell, and `import-csv` does NOT coerce it to the
 *      column's type. LIVE-PROVEN on devtest: the same `BIGINT` column reads back as the number
 *      `36` for a row written by `append` and as the string `"41"` for a row written by this
 *      operation. A downstream `$json.age + 1` therefore adds on one and concatenates on the
 *      other. The node does not paper over this by coercing, because coercing sometimes is worse
 *      than never.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The ID of the space holding the dataset. This operation makes one request for all input items, so an expression here is evaluated against the first item only.',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['appendMany'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		description:
			'The name of the dataset to append the rows to. This operation makes one request for all input items, so an expression here is evaluated against the first item only.',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['appendMany'],
			},
		},
	},
	dataModeProperty('datasetRow', 'appendMany', ['autoMapInputData', 'json'], 'autoMapInputData'),
	dataJsonProperty('datasetRow', 'appendMany'),
	{
		displayName: 'Create Table if Missing',
		name: 'createTableIfMissing',
		type: 'boolean',
		default: false,
		description:
			'Whether to let the import create the dataset when it does not exist. A CSV is untyped, so a table created this way gets all-VARCHAR columns. When this is off the node first lists the space\'s tables and fails with a named error instead, because the API answers 200 to an import into a mistyped table name and the rows land in a new empty shadow table with nothing reported.',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['appendMany'],
			},
		},
	},
	ignoreFieldsOption('datasetRow', 'appendMany'),
];

/**
 * Runs once per node execution over every input item.
 *
 * The `pairedItem` of the single emitted row is an ARRAY naming all of them - legal per
 * `IPairedItemData | IPairedItemData[] | number` in `n8n-workflow` - and it is the only honest
 * lineage available, because the row genuinely descends from every input item.
 */
export async function executeAll(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', 0) as string;
	const tableName = this.getNodeParameter('tableName', 0) as string;
	const createTableIfMissing = this.getNodeParameter('createTableIfMissing', 0) as boolean;

	const rows: IDataObject[] = [];
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		rows.push(resolveRowData.call(this, itemIndex, items[itemIndex].json));
	}

	// One `GET …/tables` per node execution, not per item: it turns a typo'd table name into a
	// named error, and it is also what makes the CSV header the table's column order rather than
	// whichever item happened to arrive first.
	let table: TableSummary | null = null;
	if (!createTableIfMissing) {
		const tablesResponse = await oneAiApiRequest.call(this, {
			method: 'GET',
			endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables`,
		});
		table = requireTable(this.getNode(), readTables(tablesResponse), tableName, 0);
	}

	const header = buildHeader.call(this, rows, table);
	const csv = buildCsv(header, rows);

	const response = (await oneAiApiRequestBinary.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}/import-csv`,
		body: Buffer.from(csv, 'utf8'),
		contentType: 'text/csv',
	})) as ImportCsvResponse;

	return [
		{
			json: {
				tableId: response.tableId,
				created: response.created,
				inserted: response.inserted,
				version: response.version,
				totalRowCount: response.totalRowCount,
				tableName,
				spaceId,
				rowsSent: rows.length,
			},
			pairedItem: items.map((_, itemIndex) => ({ item: itemIndex })),
		},
	];
}
