import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Pattern ID',
		name: 'patternId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the pattern to update',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['toggleEnabled'],
			},
		},
	},
	{
		displayName: 'Enabled',
		name: 'isEnabled',
		type: 'boolean',
		required: true,
		default: true,
		description: 'Whether the pattern is enabled',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['toggleEnabled'],
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
		endpoint: `/api/compliance/pattern/${patternId}`,
		body: {
			isEnabled,
		},
	});

	return this.helpers.returnJsonArray(response);
}
