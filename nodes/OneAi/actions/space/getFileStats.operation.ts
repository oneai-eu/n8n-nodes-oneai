import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * `GET /api/spaces/{spaceId}/files/stats` - the completion signal for the ingestion loop.
 *
 * `space:uploadFile` and `space:embedFiles` both return as soon as the work is *queued*;
 * embedding itself runs asynchronously and nothing on the shipped surface reported when it had
 * finished. A workflow could therefore only guess at a Wait duration. This operation is what an
 * IF node asks instead: poll until `pending` reaches zero.
 *
 * Note on vocabulary, deliberately not normalised: this endpoint calls the bad-type bucket
 * `unsupported`, while `space:listFiles`'s `embeddingStatus` filter calls the same thing
 * `badType`. Both are the API's own words.
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
				operation: ['getFileStats'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/files/stats`,
	});

	return this.helpers.returnJsonArray(response).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
