import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * `POST /api/chats/{chatId}/blobs/{blobId}/url` returns `{ url }` as JSON - the bytes never enter
 * n8n - so this is the cheap sibling of `chat:getBlob` and not a worse version of it. The URL
 * points at `GET /api/blobs/{blobId}/raw`, which the spec declares with `security: []` and
 * required `expires` + `signature` query parameters: a signed, time-limited, UNAUTHENTICATED
 * link. Slack renders it, an HTML mail embeds it, and an HTTP Request node with no credential
 * fetches it - and n8n persists it in the execution data, so anyone who can open the execution
 * can fetch the blob until it expires. That is stated in the operation description, where the
 * author reads it before choosing.
 *
 * 🔴 The body is sent unconditionally, and that is the trap in this operation. The endpoint
 * declares `requestBody.required: true` while its only property, `thumbnail`, is optional, and
 * `oneAiApiRequest` sends the body only when it has at least one key. Modelled as "omit unless
 * the author asks", the node would send NO BODY AT ALL against a required body. So `thumbnail` is
 * a top-level boolean with an explicit default and is always included.
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
				operation: ['getBlobUrl'],
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
				operation: ['getBlobUrl'],
			},
		},
	},
	{
		displayName: 'Thumbnail',
		name: 'thumbnail',
		type: 'boolean',
		default: false,
		description: 'Whether to link the small preview instead of the full-size blob',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['getBlobUrl'],
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
	const thumbnail = this.getNodeParameter('thumbnail', index) as boolean;

	// Always a key, always sent - see the header comment.
	const body: {
		thumbnail: boolean;
	} = {
		thumbnail,
	};

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/chats/${encodeURIComponent(chatId)}/blobs/${encodeURIComponent(blobId)}/url`,
		body,
	});

	return this.helpers.returnJsonArray(response).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
