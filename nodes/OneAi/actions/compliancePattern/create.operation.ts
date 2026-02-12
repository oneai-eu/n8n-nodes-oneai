import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'The title of the pattern',
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
		description: 'Description of what the pattern detects',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated list of filter patterns (regex)',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		required: true,
		default: 'redact',
		description: 'Action to take when pattern is matched',
		options: [
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
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['create'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const title = this.getNodeParameter('title', index) as string;
	const description = this.getNodeParameter('description', index) as string;
	const filterString = this.getNodeParameter('filter', index) as string;
	const action = this.getNodeParameter('action', index) as string;

	const filter = filterString.split(',').map((f) => f.trim());

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/compliance/pattern',
		body: {
			title,
			description,
			filter,
			action,
		},
	});

	return this.helpers.returnJsonArray(response);
}
