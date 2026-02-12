import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the project',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Short project description',
			},
			{
				displayName: 'System Prompt',
				name: 'systemPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'Raw system prompt (may include XML references)',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as {
		description?: string;
		systemPrompt?: string;
	};

	const body: {
		name: string;
		description?: string;
		systemPrompt?: string;
	} = {
		name,
	};

	if (additionalFields.description) {
		body.description = additionalFields.description;
	}

	if (additionalFields.systemPrompt) {
		body.systemPrompt = additionalFields.systemPrompt;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/projects',
		body,
	});

	return this.helpers.returnJsonArray(response);
}
