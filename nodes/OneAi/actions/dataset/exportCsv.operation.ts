import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequestRaw } from '../../transport';

/**
 * `GET /api/spaces/{spaceId}/tables/{tableName}/export-csv` → `application/octet-stream`.
 *
 * Two caveats straight from the spec's own description, carried into the field help because both
 * change what an author should expect: "A table larger than the export cap is rejected rather
 * than silently truncated", and re-importing the export restores the same values "except that an
 * empty cell reads back as null".
 */
const OUTPUT_MIME_TYPE = 'text/csv';

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
				operation: ['exportCsv'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the dataset to export',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['exportCsv'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'The binary property name to write the exported CSV to',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['exportCsv'],
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
				resource: ['dataset'],
				operation: ['exportCsv'],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'Name for the exported file. Defaults to the table name with a .csv suffix.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const tableName = this.getNodeParameter('tableName', index) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const options = this.getNodeParameter('options', index) as { fileName?: string };

	const csv = await oneAiApiRequestRaw.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}/export-csv`,
	});

	const fileName = options.fileName ? options.fileName : `${tableName}.csv`;
	const binaryData = await this.helpers.prepareBinaryData(csv, fileName, OUTPUT_MIME_TYPE);

	return [
		{
			json: {
				spaceId,
				tableName,
				fileName,
				mimeType: OUTPUT_MIME_TYPE,
			},
			binary: { [binaryPropertyName]: binaryData },
			pairedItem: { item: index },
		},
	];
}
