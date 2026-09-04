import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * `POST /api/spaces/{spaceId}/files/rename`, whose spec description is the load-bearing
 * difference from `space:transferFile`: "The path is metadata, so no bytes move and the file
 * keeps its embeddings, its status and its upload metadata."
 *
 * `transfer` carries no such guarantee, and it would need a `targetSpaceId` and a full
 * `targetPath` to express what is really a rename in place - so an auto-filing workflow
 * (list a folder, extract the text, ask a model for the canonical name, rename) cannot be built
 * on it without risking the embedding work the ingestion loop just waited for.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['renameFile'],
			},
		},
	},
	{
		displayName: 'Source Path',
		name: 'sourcePath',
		type: 'string',
		required: true,
		default: '',
		description:
			'The current path of the file. List Files and List Folder both return this as path on every item.',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['renameFile'],
			},
		},
	},
	{
		displayName: 'New Name',
		name: 'newName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. invoice-2026-09.pdf',
		description:
			'The new file name, not a path. oneAI derives the target from the folder of the source path, so a rename can never move a file to another folder.',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['renameFile'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const sourcePath = this.getNodeParameter('sourcePath', index) as string;
	const newName = this.getNodeParameter('newName', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/files/rename`,
		body: {
			sourcePath,
			newName,
		},
	});

	return this.helpers.returnJsonArray(response).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
