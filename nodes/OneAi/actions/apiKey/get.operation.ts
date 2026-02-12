import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'API Key ID',
		name: 'apiKeyId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the API key to retrieve',
		displayOptions: {
			show: {
				resource: ['apiKey'],
				operation: ['get'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const apiKeyId = this.getNodeParameter('apiKeyId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/keys/${apiKeyId}`,
	});

	return this.helpers.returnJsonArray(response);
}
