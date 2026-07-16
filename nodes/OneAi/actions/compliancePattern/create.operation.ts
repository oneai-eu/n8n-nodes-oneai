import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import { extractFilterRules, filterRulesProperty } from './helpers';

export const description: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'The pattern title. Up to 80 characters.',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		default: '',
		description: 'A short pattern description. Up to 200 characters.',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['create'],
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
		],
		default: 'audit',
		description: 'The action to take when the pattern matches',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['create'],
			},
		},
	},
	filterRulesProperty('create'),
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const title = this.getNodeParameter('title', index) as string;
	const patternDescription = this.getNodeParameter('description', index) as string;
	const action = this.getNodeParameter('patternAction', index) as string;
	const filter = extractFilterRules(this.getNodeParameter('filterRules', index, {}));

	if (filter.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one filter rule with a non-empty filter value is required.',
			{ itemIndex: index },
		);
	}

	const body: IDataObject = {
		title,
		description: patternDescription,
		action,
		filter,
	};

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/compliance/pattern',
		body,
	});

	return [
		{
			json: response,
			pairedItem: { item: index },
		},
	];
}
