import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project to delete',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['delete'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const projectId = this.getNodeParameter('projectId', index) as string;

	await oneAiApiRequest.call(this, {
		method: 'DELETE',
		endpoint: `/api/projects/${projectId}`,
	});

	return this.helpers.returnJsonArray({ success: true });
}
