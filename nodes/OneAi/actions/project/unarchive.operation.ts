import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import { bulkActionOutcome, type BulkActionResponse } from './helpers';

/**
 * `POST /api/projects/bulk`, body `{ projectIds: string[], action: 'unarchive' }`,
 * `required: ["projectIds","action"]`, `projectIds.minItems: 1`, `additionalProperties: false`.
 *
 * The counterpart of `project:archive`; see that file for why the two are separate operations
 * instead of one with an Action dropdown, and why the id is sent as a one-element array.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project to restore from the archive',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['unarchive'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const projectId = this.getNodeParameter('projectId', index) as string;

	// Per-id authorization: refusals come back in `failed[]` with a 200, so the outcome is read
	// from the response body and never inferred from the status code.
	const response = (await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/projects/bulk',
		body: { projectIds: [projectId], action: 'unarchive' },
	})) as BulkActionResponse;

	return [
		{
			json: bulkActionOutcome(projectId, 'unarchive', response),
			pairedItem: { item: index },
		},
	];
}
