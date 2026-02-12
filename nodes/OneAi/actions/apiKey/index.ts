import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getStatistics from './getStatistics.operation';
import * as list from './list.operation';

export { create, del as delete, get, getStatistics, list };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['apiKey'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new API key',
				action: 'Create an API key',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an API key',
				action: 'Delete an API key',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an API key by ID',
				action: 'Get an API key',
			},
			{
				name: 'Get Statistics',
				value: 'getStatistics',
				description: 'Get API key statistics',
				action: 'Get API key statistics',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all API keys',
				action: 'List all API keys',
			},
		],
		default: 'list',
	},
	...create.description,
	...del.description,
	...get.description,
	...getStatistics.description,
	...list.description,
];
