import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * `POST /api/chats/{chatId}/blobs/{blobId}/save` files a chat blob into a space without the bytes
 * ever crossing n8n. Once it is a space file, `space:embedFiles`, `space:listFiles` and the whole
 * `reference` surface reach it - and for a large blob this is the cheap path, because
 * `chat:getBlob` would pull it through the execution record.
 *
 * `spaceId`, `path` and `replace` are all REQUIRED by the schema, `replace` included, so it is a
 * plain top-level boolean rather than an entry in a collection: an absent `replace` is a 400.
 *
 * Output: the endpoint answers `{}` with `additionalProperties: false`, and `returnJsonArray({})`
 * would emit one empty item that a downstream IF or Merge cannot key on. This operation emits the
 * identifiers it was given plus `success: true`, the shape nodes-base uses for the same situation
 * (Google Drive's `deleteFile` returns `{ id, success: true }`). 🔴 This differs from the older
 * void operations in this node (`chat:delete`, `space:removeUser`, `space:transferFile`), which
 * emit an empty item. The difference is deliberate and strictly additive - aligning the old ones
 * would silently change the output of shipped operations.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the chat the blob belongs to',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['saveBlobToSpace'],
			},
		},
	},
	{
		displayName: 'Blob ID',
		name: 'blobId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The ID of the blob. Blob parts sit on assistant messages, so use Get on this resource, then split out messages and then parts, and take blobId from every part whose type is blob. Get Many is not a discovery path: it carries only the parts of the last user message.',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['saveBlobToSpace'],
			},
		},
	},
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space to save the blob into',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['saveBlobToSpace'],
			},
		},
	},
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Generated/diagram.png',
		description: 'The path to save the file under, inside the target space',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['saveBlobToSpace'],
			},
		},
	},
	{
		displayName: 'Replace',
		name: 'replace',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether to overwrite an existing file at that path',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['saveBlobToSpace'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const chatId = this.getNodeParameter('chatId', index) as string;
	const blobId = this.getNodeParameter('blobId', index) as string;
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const path = this.getNodeParameter('path', index) as string;
	const replace = this.getNodeParameter('replace', index) as boolean;

	const body: {
		spaceId: string;
		path: string;
		replace: boolean;
	} = {
		spaceId,
		path,
		replace,
	};

	await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/chats/${encodeURIComponent(chatId)}/blobs/${encodeURIComponent(blobId)}/save`,
		body,
	});

	return this.helpers
		.returnJsonArray({ chatId, blobId, spaceId, path, success: true })
		.map((item) => ({
			...item,
			pairedItem: { item: index },
		}));
}
