import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * `GET /api/spaces/{spaceId}/files/extracted` responds `application/json` with `{ markdown }`,
 * so this is a JSON operation and not a binary one - unlike `space:downloadFile` next door,
 * which reads `application/octet-stream` through `oneAiApiRequestRaw`. Reading a JSON endpoint
 * through the binary helper (or the reverse) is this repository's recurring response-shape
 * defect and no drift tier can see it; the transport helper here was chosen against the spec's
 * declared 200 content type.
 *
 * Output is a deliberate exception to "emit the response verbatim": `{ markdown }` alone carries
 * no identity, so fifty files fanned into this operation would each emit an anonymous wall of
 * text. `spaceId` and `path` are echoed back the way `space:downloadFile` already does.
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
				operation: ['getExtractedText'],
			},
		},
	},
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description:
			'The path of the file whose extracted text to get. List Files and List Folder both return this as path on every item.',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['getExtractedText'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const path = this.getNodeParameter('path', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/files/extracted`,
		qs: {
			path,
		},
	});

	const markdown = response.markdown as string;

	return this.helpers.returnJsonArray({ spaceId, path, markdown }).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
