import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project to update',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The new name of the project',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['update'],
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
				displayName: 'Pinned',
				name: 'pinned',
				type: 'boolean',
				default: false,
				description: 'Whether the project is pinned',
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
	const projectId = this.getNodeParameter('projectId', index) as string;
	const name = this.getNodeParameter('name', index) as string;
	const updateFields = this.getNodeParameter('updateFields', index) as {
		description?: string;
		pinned?: boolean;
		systemPrompt?: string;
	};

	const body: {
		name: string;
		description?: string;
		pinned?: boolean;
		systemPrompt?: string;
	} = {
		name,
	};

	if (updateFields.description !== undefined) {
		body.description = updateFields.description;
	}

	if (updateFields.pinned !== undefined) {
		body.pinned = updateFields.pinned;
	}

	if (updateFields.systemPrompt !== undefined) {
		body.systemPrompt = updateFields.systemPrompt;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/projects/${projectId}`,
		body,
	});

	return this.helpers.returnJsonArray(response);
}
