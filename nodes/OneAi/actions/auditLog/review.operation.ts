import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * 🔴 `PUT /api/audit/logs/{id}/review` - a PUT, not a POST and not a PATCH. It records an
 * organization admin's verdict on a log the compliance layer flagged: `unblock` approves the
 * request that was held, `block` declines it and keeps it blocked.
 *
 * This is the step that lets the approval happen wherever the organization already approves
 * things: `auditLog:list` (which emits one item per log, each carrying `id` and
 * `summary.reviewRequired`) into Slack / Teams / Jira, and the answer back into this operation.
 * No Split Out is needed in between - list already fans out.
 *
 * 🔴 The action string is "Submit a review verdict on an audit log", never "Update". The
 * operation is reachable by an AI agent and cannot be hidden - `INodeTypeBaseDescription` has no
 * `properties`, so `usableAsTool` is all-or-nothing for the whole node - and the action string is
 * the only signal an author or a model gets about what this call does to a compliance record.
 *
 * `text` is capped at 80 characters by the API (`maxLength: 80`), which `INodeProperties` cannot
 * express. The limit is stated in the field description and is NOT enforced client-side: silently
 * shortening a compliance note is worse than a 400, for the same reason the CSV import does not
 * coerce cell types.
 *
 * Output: the endpoint answers `{}`, so the operation emits the identifiers it was given plus
 * `success: true`, as `chat:rateMessage` and `chat:saveBlobToSpace` do.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Audit Log ID',
		name: 'auditLogId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The ID of the flagged audit log to review. List and Get on this resource both return it, and List also reports whether a review is required, as summary.reviewRequired.',
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['review'],
			},
		},
	},
	{
		displayName: 'Outcome',
		name: 'outcome',
		type: 'options',
		required: true,
		default: 'block',
		description: 'The verdict to record on the flagged log',
		options: [
			{
				name: 'Block',
				value: 'block',
				description: 'Decline the request and keep it blocked',
			},
			{
				name: 'Unblock',
				value: 'unblock',
				description: 'Approve the request and let it through',
			},
		],
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['review'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['review'],
			},
		},
		options: [
			{
				displayName: 'Review Note',
				name: 'text',
				type: 'string',
				default: '',
				description:
					'Note recorded alongside the verdict, at most 80 characters. oneAI rejects longer text rather than truncating it, and this node does not shorten it either.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const auditLogId = this.getNodeParameter('auditLogId', index) as string;
	const outcome = this.getNodeParameter('outcome', index) as 'block' | 'unblock';
	const additionalFields = this.getNodeParameter('additionalFields', index) as {
		text?: string;
	};

	const body: {
		outcome: 'block' | 'unblock';
		text?: string;
	} = {
		outcome,
	};

	if (additionalFields.text) {
		body.text = additionalFields.text;
	}

	await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: `/api/audit/logs/${encodeURIComponent(auditLogId)}/review`,
		body,
	});

	return this.helpers.returnJsonArray({ auditLogId, outcome, success: true }).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
