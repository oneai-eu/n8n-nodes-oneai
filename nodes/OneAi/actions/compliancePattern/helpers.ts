import type { INodeProperties } from 'n8n-workflow';

export interface FilterRule {
	type: 'contains' | 'regex';
	filter: string;
}

/**
 * The filter-rules editor shared by the create and edit operations. Only the
 * bound operation differs, so it is built from a single definition to keep the
 * two in sync.
 */
export function filterRulesProperty(operation: string): INodeProperties {
	return {
		displayName: 'Filter Rules',
		name: 'filterRules',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Filter Rule',
		default: {},
		description: 'The rules that decide when this pattern matches',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: [operation],
			},
		},
		options: [
			{
				displayName: 'Rule',
				name: 'rule',
				values: [
					{
						displayName: 'Match Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Contains', value: 'contains' },
							{ name: 'Regex', value: 'regex' },
						],
						default: 'contains',
						description: 'Whether to match a substring or a regular expression',
					},
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'string',
						default: '',
						description: 'The word, phrase, or regex pattern to match',
					},
				],
			},
		],
	};
}

/** Convert the fixedCollection value into the API's filter-rule array. */
export function extractFilterRules(raw: unknown): FilterRule[] {
	const rules = (raw as { rule?: FilterRule[] } | undefined)?.rule ?? [];
	return rules
		.filter((r) => typeof r.filter === 'string' && r.filter.length > 0)
		.map((r) => ({ type: r.type, filter: r.filter }));
}
