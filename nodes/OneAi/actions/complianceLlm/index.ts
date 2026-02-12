import type { INodeProperties } from 'n8n-workflow';

import * as getStatus from './getStatus.operation';
import * as updateSettings from './updateSettings.operation';

export { getStatus, updateSettings };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['complianceLlm'],
			},
		},
		options: [
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Get the compliance LLM status',
				action: 'Get compliance LLM status',
			},
			{
				name: 'Update Settings',
				value: 'updateSettings',
				description: 'Update the compliance LLM settings',
				action: 'Update compliance LLM settings',
			},
		],
		default: 'getStatus',
	},
	...getStatus.description,
	...updateSettings.description,
];
