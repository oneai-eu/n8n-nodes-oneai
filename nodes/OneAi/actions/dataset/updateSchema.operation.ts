import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import {
	columnDefinitionValues,
	extractColumns,
	extractRenames,
	splitList,
	type ColumnDefinition,
	type RenameColumn,
	type UpdateSchemaResponse,
} from './helpers';

/**
 * `PATCH /api/spaces/{spaceId}/tables/{tableName}`, body
 * `{ addColumns?, dropColumns?, renameColumns?, description? }`, `additionalProperties: false`,
 * nothing required.
 *
 * This is how a workflow absorbs an upstream schema change deliberately. The alternative - having
 * `datasetRow:append` add a column when it meets an unknown key - is rejected: the API's rejection
 * of an unknown column is information that the source shape moved, and a node that swallows it
 * lets the dataset's schema become whatever anything ever sent it.
 *
 * `description` is tri-state in the spec: "Set the table's description (string), clear it (null),
 * or omit to leave it unchanged." That is why there are two fields for it.
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
				operation: ['updateSchema'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the dataset whose schema to change',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['updateSchema'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['updateSchema'],
			},
		},
		options: [
			{
				displayName: 'Add Columns',
				name: 'addColumns',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				placeholder: 'Add Column',
				default: {},
				description: 'Columns to add to the dataset. Existing rows get null in them.',
				options: [
					{
						displayName: 'Column',
						name: 'column',
						values: columnDefinitionValues,
					},
				],
			},
			{
				displayName: 'Clear Description',
				name: 'clearDescription',
				type: 'boolean',
				default: false,
				description:
					"Whether to clear the dataset's description. This wins over the Description field when both are set.",
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: "Set the dataset's description. Ignored when Clear Description is on.",
			},
			{
				displayName: 'Drop Columns',
				name: 'dropColumns',
				type: 'string',
				default: '',
				placeholder: 'legacy_id,notes',
				description:
					'Comma-separated list of column names to drop. The data in them is discarded.',
			},
			{
				displayName: 'Rename Columns',
				name: 'renameColumns',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				placeholder: 'Add Rename',
				default: {},
				description: 'Columns to rename, preserving their type and data',
				options: [
					{
						displayName: 'Rename',
						name: 'rename',
						values: [
							{
								displayName: 'From',
								name: 'from',
								type: 'string',
								default: '',
								description: 'The existing column name',
							},
							{
								displayName: 'To',
								name: 'to',
								type: 'string',
								default: '',
								description:
									'The new column name. Identifier only: starts with a letter or underscore, then letters, digits or underscores.',
							},
						],
					},
				],
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
	const updateFields = this.getNodeParameter('updateFields', index) as {
		addColumns?: unknown;
		clearDescription?: boolean;
		description?: string;
		dropColumns?: string;
		renameColumns?: unknown;
	};

	// `additionalProperties: false`, so only send what the author actually filled in.
	const body: {
		addColumns?: ColumnDefinition[];
		dropColumns?: string[];
		renameColumns?: RenameColumn[];
		description?: string | null;
	} = {};

	const addColumns = extractColumns(updateFields.addColumns);
	if (addColumns.length > 0) {
		body.addColumns = addColumns;
	}

	const dropColumns = splitList(updateFields.dropColumns ?? '');
	if (dropColumns.length > 0) {
		body.dropColumns = dropColumns;
	}

	const renameColumns = extractRenames(updateFields.renameColumns);
	if (renameColumns.length > 0) {
		body.renameColumns = renameColumns;
	}

	if (updateFields.clearDescription === true) {
		body.description = null;
	} else if (updateFields.description) {
		body.description = updateFields.description;
	}

	if (Object.keys(body).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'Update Fields is empty, so this operation would change nothing',
			{
				itemIndex: index,
				description:
					'Add at least one of Add Columns, Drop Columns, Rename Columns, Description or Clear Description.',
			},
		);
	}

	const response = (await oneAiApiRequest.call(this, {
		method: 'PATCH',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables/${encodeURIComponent(tableName)}`,
		body,
	})) as UpdateSchemaResponse;

	return [
		{
			json: {
				tableId: response.tableId,
				columns: response.columns,
				version: response.version,
				tableName,
				spaceId,
			},
			pairedItem: { item: index },
		},
	];
}
