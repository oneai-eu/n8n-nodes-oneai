import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequestRaw } from '../../transport';

/**
 * `GET /api/chats/{chatId}/blobs/{blobId}` declares `application/octet-stream` on its 200, so it
 * is read through `oneAiApiRequestRaw` and never through the JSON helper. Reading a binary
 * endpoint through `oneAiApiRequest` is this repository's recurring response-shape defect
 * (`artifact:exportPdf`, `space:downloadFile`); no drift tier can see it, because tier 1 only
 * resolves the path and tier 3 has no request body to compare.
 *
 * 🔴 The MIME type is passed to `prepareBinaryData` EXPLICITLY, always. n8n's helper sniffs only
 * when no MIME type is given, and its last fallback is `text/plain` - a silent wrong answer that
 * also loses the image preview in the editor, because n8n derives its `fileType` category from
 * the MIME type. So `mimeType` is a required top-level parameter with a real default rather than
 * an optional entry in an `Options` collection, whose natural state is "absent" and therefore
 * "sniff". The authoritative value is one node upstream: the `blob` part returned by this
 * resource's `Get` carries `mimeType` as a REQUIRED field.
 *
 * `DEFAULT_BLOB_MIME_TYPE` exists only so that an emptied parameter still produces an explicit
 * label. `application/octet-stream` is honest about "unknown bytes"; `text/plain` is not.
 *
 * Incoming `item.binary` is copied forward, so a binary property that arrived from an upstream
 * node survives this operation. n8n's own Google Drive download does this; our five older binary
 * operations do not, and retrofitting them would change the output of shipped operations - filed,
 * not done here.
 *
 * Discovery of `blobId`: this resource's `Get` only. `Get Many` also contains a `blobId`, but
 * under `chats[].lastUserMessage.parts` - a USER message - while generated images live on
 * assistant messages.
 */

/** Used only when the author empties the MIME Type parameter; never `text/plain`. */
const DEFAULT_BLOB_MIME_TYPE = 'application/octet-stream';

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
				operation: ['getBlob'],
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
				operation: ['getBlob'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'The binary property name to write the downloaded blob to',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['getBlob'],
			},
		},
	},
	{
		displayName: 'MIME Type',
		name: 'mimeType',
		type: 'string',
		required: true,
		default: 'image/png',
		description:
			'The MIME type to label the downloaded bytes with. Get on this resource returns mimeType on every blob part, so wire it from there rather than relying on the default. n8n derives the file extension and the editor preview from this value.',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['getBlob'],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'e.g. diagram.png',
		description:
			'Name to give the downloaded file. Leave it empty to use the blob ID, which has no extension, so the extension derived from the MIME type still applies. Get on this resource returns filename on some blob parts.',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['getBlob'],
			},
		},
	},
	{
		displayName: 'Thumbnail',
		name: 'thumbnail',
		type: 'boolean',
		default: false,
		description:
			'Whether to download the small preview instead of the full-size blob. A thumbnail may not have the MIME type of the original.',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['getBlob'],
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
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const mimeTypeParameter = this.getNodeParameter('mimeType', index) as string;
	const fileNameParameter = this.getNodeParameter('fileName', index) as string;
	const thumbnail = this.getNodeParameter('thumbnail', index) as boolean;

	// Sent only when true: a query string carries `false` as the non-empty string "false", which a
	// permissive parser reads as truthy. Absent means false server-side. Harmless for this
	// parameter, and identical to `chat:export`, where it is not harmless.
	const qs: {
		thumbnail?: boolean;
	} = {};

	if (thumbnail) {
		qs.thumbnail = true;
	}

	const blob = await oneAiApiRequestRaw.call(this, {
		method: 'GET',
		endpoint: `/api/chats/${encodeURIComponent(chatId)}/blobs/${encodeURIComponent(blobId)}`,
		qs,
	});

	const fileName = fileNameParameter || blobId;
	const mimeType = mimeTypeParameter || DEFAULT_BLOB_MIME_TYPE;

	const binaryData = await this.helpers.prepareBinaryData(blob, fileName, mimeType);

	const incomingBinary = this.getInputData()[index]?.binary;

	return [
		{
			json: { chatId, blobId, thumbnail, fileName, mimeType },
			binary: { ...incomingBinary, [binaryPropertyName]: binaryData },
			pairedItem: { item: index },
		},
	];
}
