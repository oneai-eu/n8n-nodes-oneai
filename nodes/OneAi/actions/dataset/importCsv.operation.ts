import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestBinary } from '../../transport';
import { readTables, requireTable, type ImportCsvResponse } from './helpers';

/**
 * `POST /api/spaces/{spaceId}/tables/{tableName}/import-csv`. The request body is declared
 * `text/csv` and nothing else - there is no `multipart/form-data` anywhere in it - so the bytes
 * of a binary property go up untouched.
 *
 * This is deliberately separate from `datasetRow:appendMany`. An author who already holds a CSV
 * should not have to round-trip it through Extract From File into items and back out through our
 * re-serialisation, because that round trip is lossy at exactly the places CSV is hard: embedded
 * newlines, quoting, and empty versus NULL.
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
				resource: ['dataset'],
				operation: ['importCsv'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the dataset to append the CSV rows to',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['importCsv'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'The name of the binary property holding the CSV file to import',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['importCsv'],
			},
		},
	},
	{
		displayName: 'Create Table if Missing',
		name: 'createTableIfMissing',
		type: 'boolean',
		default: false,
		description:
			'Whether to let the import create the dataset when it does not exist. A CSV is untyped, so a table created this way gets all-VARCHAR columns from the header row. When this is off the node first lists the space\'s tables and fails with a named error instead, because the API answers 200 to an import into a mistyped table name and the rows land in a new empty shadow table with nothing reported.',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['importCsv'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const tableName = this.getNodeParameter('tableName', index) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const createTableIfMissing = this.getNodeParameter('createTableIfMissing', index) as boolean;

	if (!createTableIfMissing) {
		const tablesResponse = await oneAiApiRequest.call(this, {
			method: 'GET',
			endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables`,
		});
		requireTable(this.getNode(), readTables(tablesResponse), tableName, index);
	}

	const csv = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);

	const response = (await oneAiApiRequestBinary.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}/import-csv`,
		body: csv,
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
			},
			pairedItem: { item: index },
		},
	];
}
