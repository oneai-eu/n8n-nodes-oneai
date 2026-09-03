import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import {
	columnDefinitionValues,
	extractColumns,
	type ColumnDefinition,
	type CreateTableResponse,
} from './helpers';

/**
 * `POST /api/spaces/{spaceId}/tables`, body `{ name, columns[], description? }`,
 * `required: ["name","columns"]`, `columns.minItems: 1`, `additionalProperties: false`.
 *
 * This operation exists so that the node never has to infer a schema. A table created from the
 * first item that happened to arrive fixes every column's type on a sample of one, permanently -
 * nothing in the API retypes a column afterwards - so the author declares it here instead.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space to create the dataset in',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Table Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'customers',
		description:
			'Identifier only: starts with a letter or underscore, then letters, digits or underscores. No spaces or punctuation.',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		placeholder: 'Add Column',
		default: {},
		description: 'The columns that fix the dataset schema. At least one is required.',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Column',
				name: 'column',
				values: columnDefinitionValues,
			},
		],
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
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Human-authored description of what the dataset holds',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const name = this.getNodeParameter('name', index) as string;
	const options = this.getNodeParameter('options', index) as { description?: string };

	const columns = extractColumns(this.getNodeParameter('columns', index));
	if (columns.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'A dataset needs at least one column, and none were defined',
			{
				itemIndex: index,
				description:
					'Add a column under "Columns". The schema is fixed at creation and cannot be inferred from data later.',
			},
		);
	}

	const body: { name: string; columns: ColumnDefinition[]; description?: string } = {
		name,
		columns,
	};

	if (options.description) {
		body.description = options.description;
	}

	const response = (await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables`,
		body,
	})) as CreateTableResponse;

	return [
		{
			json: {
				tableId: response.tableId,
				version: response.version,
				name,
				spaceId,
			},
			pairedItem: { item: index },
		},
	];
}
