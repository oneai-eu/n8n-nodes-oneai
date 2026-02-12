import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Pattern ID',
		name: 'patternId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the pattern to edit',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['edit'],
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
				resource: ['compliancePattern'],
				operation: ['edit'],
			},
		},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'New title for the pattern',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'New description for the pattern',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				description: 'Comma-separated list of new filter patterns (regex)',
			},
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				default: '',
				description: 'New action for the pattern',
				options: [
					{
						name: 'No Change',
						value: '',
					},
					{
						name: 'Redact',
						value: 'redact',
					},
					{
						name: 'Block',
						value: 'block',
					},
					{
						name: 'Warn',
						value: 'warn',
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
	const patternId = this.getNodeParameter('patternId', index) as string;
	const updateFields = this.getNodeParameter('updateFields', index) as {
		title?: string;
		description?: string;
		filter?: string;
		action?: string;
	};

	const body: {
		title?: string;
		description?: string;
		filter?: string[];
		action?: string;
	} = {};

	if (updateFields.title) {
		body.title = updateFields.title;
	}
	if (updateFields.description) {
		body.description = updateFields.description;
	}
	if (updateFields.filter) {
		body.filter = updateFields.filter.split(',').map((f) => f.trim());
	}
	if (updateFields.action) {
		body.action = updateFields.action;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/compliance/pattern/edit/${patternId}`,
		body,
	});

	return this.helpers.returnJsonArray(response);
}
