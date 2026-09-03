import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import { splitList } from '../dataset/helpers';
import type { DeleteRowsResponse } from './helpers';

/**
 * `DELETE /api/spaces/{spaceId}/tables/{tableName}/rows`.
 *
 * Note the shape: `rowIds` is a QUERY parameter of `type: string` whose content is a
 * "JSON-encoded array of row ids to delete", so it is `JSON.stringify`d rather than repeated.
 *
 * One call per input item. Two hundred items each holding one id therefore cost two hundred
 * calls - but an Aggregate node in front, joining the ids into one comma-separated field, turns
 * that into one call. That idiom is documented here rather than built into a second bulk
 * operation, because core n8n already does the aggregating.
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
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the dataset to delete rows from',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Row IDs',
		name: 'rowIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: '={{ $json.rowId }}',
		description:
			'A row ID to delete, or a comma-separated list of them. To delete many rows in one request, put an Aggregate node in front and join the rowId field.',
		displayOptions: {
			show: {
				resource: ['datasetRow'],
				operation: ['delete'],
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
	const ids = splitList(this.getNodeParameter('rowIds', index) as string);

	if (ids.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Row IDs is empty, so there is nothing to delete', {
			itemIndex: index,
		});
	}

	const response = (await oneAiApiRequest.call(this, {
		method: 'DELETE',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}/rows`,
		qs: { rowIds: JSON.stringify(ids) },
	})) as DeleteRowsResponse;

	return [
		{
			json: {
				spaceId,
				tableName,
				deleted: response.deleted,
				ids: response.ids,
				version: response.version,
				totalRowCount: response.totalRowCount,
			},
			pairedItem: { item: index },
		},
	];
}
