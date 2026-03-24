import type { INodeProperties } from 'n8n-workflow';

import * as checkAuth from './check.operation';

export { checkAuth };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['miscellaneous'],
			},
		},
		options: [
			{
				name: 'Check Authentication',
				value: 'checkAuth',
				description: 'Check the authenticated user and return their details',
				action: 'Check authenticated user',
			},
		],
		default: 'checkAuth',
	},
	...checkAuth.description,
];
