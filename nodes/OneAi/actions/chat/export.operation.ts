import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * `GET /api/chats/{chatId}/export` declares `application/json` on its 200 and answers
 * `{ filename, markdown }` - the Markdown arrives as a JSON string field, so this is a JSON
 * operation and NOT a binary one. An author who wants a file is one `Convert to File` node away;
 * a "put output in a binary field" option here would duplicate a core node and add a second
 * output contract to maintain forever.
 *
 * 🔴 `full` is sent ONLY when true. `oneAiApiRequest` hands `qs` to n8n's HTTP helper, which
 * serialises `false` as the non-empty string "false", and a permissive server-side parser reads a
 * present value as truthy. The failure mode of getting this wrong is silently exporting the
 * values compliance redaction removed, from a workflow whose author left the switch off. The spec
 * says the parameter defaults to false, so omitting it is both correct and the only encoding
 * whose failure is safe.
 *
 * Output is verbatim: `filename` carries the identity, so the "echo the identifiers" exception
 * that `space:getExtractedText` needs does not apply here.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the chat to export',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['export'],
			},
		},
	},
	{
		// The display name deliberately does not echo the API's `full`: "Full" tells an author
		// nothing, and this is the one parameter in the family whose wrong setting is a data
		// leak. The parameter NAME stays `full` - API-faithful, and permanent.
		displayName: 'Include Redacted Values',
		name: 'full',
		type: 'boolean',
		default: false,
		description:
			'Whether to include the original values that compliance redaction removed. Off, redacted values stay masked as [redacted]. On, the unredacted originals are written into this workflow output and persisted in the execution record, where anyone who can open the execution can read them.',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['export'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const chatId = this.getNodeParameter('chatId', index) as string;
	const full = this.getNodeParameter('full', index) as boolean;

	const qs: {
		full?: boolean;
	} = {};

	if (full) {
		qs.full = true;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/chats/${encodeURIComponent(chatId)}/export`,
		qs,
	});

	return this.helpers.returnJsonArray(response).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
