import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space containing the artifact',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Artifact ID',
		name: 'artifactId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the artifact to delete',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['delete'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const artifactId = this.getNodeParameter('artifactId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'DELETE',
		endpoint: `/api/spaces/${spaceId}/artifacts/${artifactId}`,
	});

	return this.helpers.returnJsonArray(response);
}
