import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import { extractFilterRules, filterRulesProperty } from './helpers';

export const description: INodeProperties[] = [
	{
		displayName: 'Pattern ID',
		name: 'patternId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the custom pattern to edit. Default patterns cannot be edited.',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['edit'],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'Updated pattern title. Leave empty to keep the current value.',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['edit'],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'Updated pattern description. Leave empty to keep the current value.',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['edit'],
			},
		},
	},
	{
		displayName: 'Action',
		name: 'patternAction',
		type: 'options',
		options: [
			{ name: 'Audit', value: 'audit' },
			{ name: 'Audit & Block', value: 'auditBlock' },
			{ name: 'Audit & Redact', value: 'auditRedact' },
			{ name: 'Audit & Review', value: 'auditReview' },
			{ name: 'Keep Current', value: '' },
		],
		default: '',
		description: 'The action to take when the pattern matches. Leave as "Keep Current" to keep the existing value.',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['edit'],
			},
		},
	},
	filterRulesProperty('edit'),
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const patternId = this.getNodeParameter('patternId', index) as string;
	const title = this.getNodeParameter('title', index, '') as string;
	const patternDescription = this.getNodeParameter('description', index, '') as string;
	const action = this.getNodeParameter('patternAction', index, '') as string;
	const filter = extractFilterRules(this.getNodeParameter('filterRules', index, {}));

	const body: IDataObject = {};
	if (title) {
		body.title = title;
	}
	if (patternDescription) {
		body.description = patternDescription;
	}
	if (action) {
		body.action = action;
	}
	if (filter.length > 0) {
		body.filter = filter;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/compliance/pattern/edit/${encodeURIComponent(patternId)}`,
		body,
	});

	return [
		{
			json: response,
			pairedItem: { item: index },
		},
	];
}
