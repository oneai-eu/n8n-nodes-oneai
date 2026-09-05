import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * The `origin` enum, verbatim from `openapi/openapi.json`. It is declared identically on
 * `GET /api/audit/logs` (query) and `POST /api/audit/logs/export` (body), so it lives here rather
 * than being typed out twice - the two copies drifting apart is exactly how the defect below
 * survived.
 *
 * 🔴 The shipped `auditLog:list` offered only two values, one of which - `onegateway:compliance` -
 * is NOT in the spec's enum at all. It appears to have become `onegateway:compliancellm`, so the
 * option could only ever produce a 400. No checker in this repository can see that: the drift
 * check compares request *shapes*, not enum *values*, and to lint and `tsc` it is a string.
 * Removing it is safe by construction, because a value that has never worked cannot be a
 * behaviour any workflow depends on.
 *
 * The list is sorted by display name, which n8n's lint requires of any option list with five or
 * more entries.
 */
export const AUDIT_LOG_ORIGIN_OPTIONS: INodePropertyOptions[] = [
	{ name: 'OneAI: Chat', value: 'oneai:chat' },
	{ name: 'OneAI: Global Settings', value: 'oneai:globalsettings' },
	{ name: 'OneAI: Member', value: 'oneai:member' },
	{ name: 'OneAI: Project', value: 'oneai:project' },
	{ name: 'OneAI: Redaction', value: 'oneai:redaction' },
	{ name: 'OneAI: Space', value: 'oneai:space' },
	{ name: 'OneGateway: Compliance LLM', value: 'onegateway:compliancellm' },
	{ name: 'OneGateway: Compliance LLM (Image)', value: 'onegateway:compliancellm:image' },
	{ name: 'OneGateway: Pattern', value: 'onegateway:pattern' },
];

/**
 * The `riskLevel` enum of `GET /api/audit/logs`, verbatim from the spec. Ordered by severity
 * rather than alphabetically: with four entries n8n's sorting rule does not apply, and the
 * severity order is the one a compliance reviewer reads.
 */
export const AUDIT_LOG_RISK_LEVEL_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Minimal', value: 'minimal' },
	{ name: 'Limited', value: 'limited' },
	{ name: 'High', value: 'high' },
	{ name: 'Unacceptable', value: 'unacceptable' },
];
