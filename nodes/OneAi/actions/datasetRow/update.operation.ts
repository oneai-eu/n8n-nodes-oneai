import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import {
	columnsUiProperty,
	dataJsonProperty,
	dataModeProperty,
	ignoreFieldsOption,
	resolveRowData,
	type UpdateRowResponse,
} from './helpers';

/**
 * `PUT /api/spaces/{spaceId}/tables/{tableName}/rows/{rowId}`, body `{ set }`, one call per item.
 *
 * `Data Mode` defaults to `Map Each Column Below` here rather than to auto-mapping, because only
 * the named columns change and a partial update rarely means "write every field of the incoming
 * item back".
 *
 * `updated: 0` is returned, not thrown. The spec documents it as "Rows updated (0 if the id no
 * longer exists)", which is an ordinary race between a read and a write; making it look like an
 * outage would be wrong, and the author can branch on it.
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
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the dataset holding the row',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '={{ $json.rowId }}',
		description:
			'The ID of the row to update, as returned by the Append and List operations in their rowId field',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['update'],
			},
		},
	},
	dataModeProperty('datasetRow', 'update', ['autoMapInputData', 'defineBelow', 'json'], 'defineBelow'),
	columnsUiProperty('datasetRow', 'update'),
	dataJsonProperty('datasetRow', 'update'),
	ignoreFieldsOption('datasetRow', 'update'),
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const tableName = this.getNodeParameter('tableName', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;

	const set = resolveRowData.call(this, index, this.getInputData()[index].json);

	const response = (await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}/rows/${encodeURIComponent(rowId)}`,
		body: { set },
	})) as UpdateRowResponse;

	return [
		{
			json: {
				rowId,
				spaceId,
				tableName,
				updated: response.updated,
				version: response.version,
				totalRowCount: response.totalRowCount,
				set,
			},
			pairedItem: { item: index },
		},
	];
}
