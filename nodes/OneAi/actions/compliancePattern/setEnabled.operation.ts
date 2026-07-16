import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Pattern ID',
		name: 'patternId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the pattern to enable or disable (default or custom)',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['setEnabled'],
			},
		},
	},
	{
		displayName: 'Enabled',
		name: 'isEnabled',
		type: 'boolean',
		default: true,
		description: 'Whether the pattern should be enabled for your organization',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['setEnabled'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const patternId = this.getNodeParameter('patternId', index) as string;
	const isEnabled = this.getNodeParameter('isEnabled', index) as boolean;

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/compliance/pattern/${encodeURIComponent(patternId)}`,
		body: { isEnabled },
	});

	return [
		{
			json: response,
			pairedItem: { item: index },
		},
	];
}
