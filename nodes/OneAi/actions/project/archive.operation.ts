import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import { bulkActionOutcome, type BulkActionResponse } from './helpers';

/**
 * `POST /api/projects/bulk`, body `{ projectIds: string[], action: 'archive' }`,
 * `required: ["projectIds","action"]`, `projectIds.minItems: 1`, `additionalProperties: false`.
 *
 * Archiving is how a project is retired now that `DELETE /api/projects/{projectId}` no longer
 * exists, so this restores a capability the node lost rather than adding a new one.
 *
 * `archive` and `unarchive` are two operations rather than one with an Action dropdown: they are
 * distinct verbs, and n8n's node creator builds a panel entry per operation from its `action`
 * string - a dropdown would put one entry in the panel where a workflow author is looking for two.
 *
 * One project per input item, sent as a one-element array: the router's item loop is the fan-out,
 * so an Item Lists or Aggregate node in front is not needed to archive many projects.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project to archive',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['archive'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const projectId = this.getNodeParameter('projectId', index) as string;

	// The endpoint authorizes each id separately and reports refusals in `failed[]` instead of
	// throwing, so a 200 here says nothing about whether this project was archived. That is
	// decided by `bulkActionOutcome`, which reads the response rather than the status.
	const response = (await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/projects/bulk',
		body: { projectIds: [projectId], action: 'archive' },
	})) as BulkActionResponse;

	return [
		{
			json: bulkActionOutcome(projectId, 'archive', response),
			pairedItem: { item: index },
		},
	];
}
