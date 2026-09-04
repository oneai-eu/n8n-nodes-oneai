import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest, oneAiApiRequestAllItems } from '../../transport';
import { AUDIT_LOG_ORIGIN_OPTIONS, AUDIT_LOG_RISK_LEVEL_OPTIONS } from './helpers';

/**
 * 🔴 Two repairs to a shipped operation, ratified as GATE R5 and R2.
 *
 * R5: the `Origin` filter used to offer `onegateway:compliance`, which is not in the spec's enum
 * and appears to have become `onegateway:compliancellm`. Selecting it could only ever produce a
 * 400. It is gone, together with the eight values that were missing, and the shared list now
 * lives in `helpers.ts` beside `auditLog:export`, which needs the same nine.
 *
 * R2: `since` and `riskLevel` are added, under the spec's own parameter names because parameter
 * names are permanent on `typeVersion: 1` and a renamed one fails silently. Without `since`, a
 * scheduled compliance poll re-reads the same logs on every tick and repeats itself downstream
 * until somebody turns the workflow off.
 */

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['list'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['list'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'options',
				options: AUDIT_LOG_ORIGIN_OPTIONS,
				default: 'onegateway:pattern',
				description: 'Filter by origin type',
			},
			{
				displayName: 'Risk Level',
				name: 'riskLevel',
				type: 'options',
				options: AUDIT_LOG_RISK_LEVEL_OPTIONS,
				default: 'high',
				description:
					'Filter by the risk level of the compliance evaluation. Only logs that carry a compliance LLM evaluation can match.',
			},
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description:
					'Only return logs created at or after this time. Set it from the previous run so a scheduled poll reads each log once; oneAI clamps it to the retention window of the plan.',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'Filter by specific user ID (admin only)',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const filters = this.getNodeParameter('filters', index) as {
		origin?: string;
		riskLevel?: string;
		since?: string;
		userId?: string;
	};

	const qs: {
		origin?: string;
		riskLevel?: string;
		since?: string;
		userId?: string;
		page?: number;
		pageSize?: number;
	} = {};

	if (filters.origin) {
		qs.origin = filters.origin;
	}

	if (filters.riskLevel) {
		qs.riskLevel = filters.riskLevel;
	}

	if (filters.since) {
		qs.since = filters.since;
	}

	if (filters.userId) {
		qs.userId = filters.userId;
	}

	if (returnAll) {
		const logs = await oneAiApiRequestAllItems.call(this, {
			method: 'GET',
			endpoint: '/api/audit/logs',
			qs,
			itemsKey: 'logs',
			paginationKey: 'pagination',
		});
		return this.helpers.returnJsonArray(logs).map((item) => ({
			...item,
			pairedItem: { item: index },
		}));
	}

	const limit = this.getNodeParameter('limit', index) as number;
	qs.pageSize = limit;
	qs.page = 0;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/audit/logs',
		qs,
	});

	const logs = (response.logs as IDataObject[]) || [];
	return this.helpers.returnJsonArray(logs).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
