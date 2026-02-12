import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as list from './list.operation';

export { get, list };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['auditLog'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get an audit log by ID',
				action: 'Get an audit log',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List audit logs',
				action: 'List audit logs',
			},
		],
		default: 'list',
	},
	...get.description,
	...list.description,
];
