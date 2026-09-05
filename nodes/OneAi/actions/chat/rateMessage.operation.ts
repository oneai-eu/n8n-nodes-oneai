import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * `POST /api/chats/{chatId}/messages/{messageId}/feedback` records a thumbs up or down on an
 * ASSISTANT message, which is where oneAI's feedback aggregate (`GET /api/chats/feedback`) reads
 * it from. It closes a quality loop that a workflow can drive on its own: generate an answer,
 * evaluate it (a Switch, a scoring node, a human approval step), record the verdict.
 *
 * 🔴 Where `messageId` comes from, and why the descriptions below name another resource. This
 * `chat` resource has NO operation that sends a message: the only shipped call to
 * `POST /api/chats/{chatId}/http` lives in `ai:createResponse`, whose 200 requires both `chatId`
 * and `messageId` and spreads them straight into the output item. An author who looks under Chat
 * for the producer finds nothing, so the parameter descriptions point at the AI resource's
 * Create Response operation by name. (Lint forbids the ">" character in a description, so it can
 * never be written as a panel breadcrumb.) This resource's `Get` is the second source, as
 * `messages[].id`.
 *
 * The API also supports removing a rating (`DELETE` on the same path). That is deliberately not
 * implemented here, and the operation description says so, so that nobody assumes a rating is
 * permanent.
 *
 * Output: the endpoint answers `{}`, so the operation emits the identifiers it was given plus
 * `success: true` - see `chat:saveBlobToSpace` for the rule and why it differs from the older
 * void operations.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		default: '',
		description:
			"The ID of the chat the message belongs to. The AI resource's Create Response operation returns it as chatId.",
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['rateMessage'],
			},
		},
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		description:
			"The ID of the assistant message to rate. The AI resource's Create Response operation returns it as messageId, and Get on this resource returns it as the ID of each entry in messages. Only assistant messages can be rated.",
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['rateMessage'],
			},
		},
	},
	{
		displayName: 'Rating',
		name: 'rating',
		type: 'options',
		required: true,
		default: 'positive',
		description: 'The rating to record on the message',
		options: [
			{
				name: 'Negative',
				value: 'negative',
				description: 'Thumbs down',
			},
			{
				name: 'Positive',
				value: 'positive',
				description: 'Thumbs up',
			},
		],
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['rateMessage'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const chatId = this.getNodeParameter('chatId', index) as string;
	const messageId = this.getNodeParameter('messageId', index) as string;
	const rating = this.getNodeParameter('rating', index) as string;

	const body: {
		rating: string;
	} = {
		rating,
	};

	await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/feedback`,
		body,
	});

	return this.helpers.returnJsonArray({ chatId, messageId, rating, success: true }).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
