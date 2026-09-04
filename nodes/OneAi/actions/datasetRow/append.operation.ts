import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import {
	columnsUiProperty,
	dataJsonProperty,
	dataModeProperty,
	ignoreFieldsOption,
	resolveRowData,
	type AppendRowResponse,
} from './helpers';

/**
 * `POST /api/spaces/{spaceId}/tables/{tableName}/rows`, body `{ data }`, one call per input item.
 *
 * The body takes a single `data` object - `type: "object"`, `additionalProperties: false` - and a
 * live `POST` of `{ data: [ … ] }` against devtest is refused with
 * "Error at 'body.data': Expected object but got array". There is no multi-row JSON endpoint to
 * batch into, so the volume path is `appendMany`, which goes through `import-csv`.
 *
 * What this operation has and `appendMany` does not: the response carries `ids[]`, so the new
 * row's id comes back and the same workflow can update or delete it later. It also sends a native
 * JSON body, so numbers, booleans and JSON column values keep their types.
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
				operation: ['append'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the dataset to append the row to. It must already exist.',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['append'],
			},
		},
	},
	dataModeProperty('datasetRow', 'append', ['autoMapInputData', 'defineBelow', 'json'], 'autoMapInputData'),
	columnsUiProperty('datasetRow', 'append'),
	dataJsonProperty('datasetRow', 'append'),
	ignoreFieldsOption('datasetRow', 'append'),
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const tableName = this.getNodeParameter('tableName', index) as string;

	const data = resolveRowData.call(this, index, this.getInputData()[index].json);

	const response = (await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}/rows`,
		body: { data },
	})) as AppendRowResponse;

	const ids = Array.isArray(response.ids) ? response.ids : [];

	return [
		{
			json: {
				rowId: ids[0] ?? null,
				spaceId,
				tableName,
				tableId: response.tableId,
				data,
				inserted: response.inserted,
				version: response.version,
				totalRowCount: response.totalRowCount,
			},
			pairedItem: { item: index },
		},
	];
}
