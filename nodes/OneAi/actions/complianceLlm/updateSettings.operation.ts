import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Enable',
		name: 'enable',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the compliance LLM should be enabled or disabled',
		displayOptions: {
			show: {
				resource: ['complianceLlm'],
				operation: ['updateSettings'],
			},
		},
	},
	{
		displayName: 'Confidence Score',
		name: 'confidenceScore',
		type: 'number',
		required: true,
		default: 0.8,
		typeOptions: {
			minValue: 0,
			maxValue: 1,
			numberStepSize: 0.01,
		},
		description: 'The confidence score that the model should have for the detection (0-1)',
		displayOptions: {
			show: {
				resource: ['complianceLlm'],
				operation: ['updateSettings'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const enable = this.getNodeParameter('enable', index) as boolean;
	const confidenceScore = this.getNodeParameter('confidenceScore', index) as number;

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: '/api/compliance/llm',
		body: {
			enable,
			confidenceScore,
		},
	});

	return this.helpers.returnJsonArray(response);
}
