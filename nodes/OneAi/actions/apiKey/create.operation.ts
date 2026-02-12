import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'A name for the API key',
		displayOptions: {
			show: {
				resource: ['apiKey'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Provider',
		name: 'provider',
		type: 'string',
		required: true,
		default: '',
		description: 'The provider the API key is for',
		displayOptions: {
			show: {
				resource: ['apiKey'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		default: '',
		description: 'The API Key value',
		displayOptions: {
			show: {
				resource: ['apiKey'],
				operation: ['create'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', index) as string;
	const provider = this.getNodeParameter('provider', index) as string;
	const key = this.getNodeParameter('key', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/keys',
		body: { name, provider, key },
	});

	return this.helpers.returnJsonArray(response);
}
