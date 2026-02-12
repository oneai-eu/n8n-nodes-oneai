import type { INodeProperties } from 'n8n-workflow';

import * as dashboard from './dashboard.operation';
import * as usage from './usage.operation';

export { dashboard, usage };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['stats'],
			},
		},
		options: [
			{
				name: 'Dashboard',
				value: 'dashboard',
				description: 'Get dashboard statistics',
				action: 'Get dashboard statistics',
			},
			{
				name: 'Usage',
				value: 'usage',
				description: 'Get usage statistics for a date range',
				action: 'Get usage statistics',
			},
		],
		default: 'dashboard',
	},
	...dashboard.description,
	...usage.description,
];
