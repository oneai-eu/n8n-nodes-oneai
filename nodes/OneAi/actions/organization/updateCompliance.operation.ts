import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Compliance Enabled',
		name: 'complianceEnabled',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether compliance is enabled for the organization',
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['updateCompliance'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const complianceEnabled = this.getNodeParameter('complianceEnabled', index) as boolean;

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: '/api/orgs/update-compliance',
		body: {
			complianceEnabled,
		},
	});

	return this.helpers.returnJsonArray(response);
}
