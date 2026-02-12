import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getStatistics from './getStatistics.operation';
import * as list from './list.operation';
import * as update from './update.operation';

export { create, del as delete, get, getStatistics, list, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new project',
				action: 'Create a project',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project',
				action: 'Delete a project',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a project by ID',
				action: 'Get a project',
			},
			// {
			// 	name: 'Get Statistics',
			// 	value: 'getStatistics',
			// 	description: 'Get project statistics',
			// 	action: 'Get project statistics',
			// },
			{
				name: 'List',
				value: 'list',
				description: 'List all projects',
				action: 'List all projects',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a project',
				action: 'Update a project',
			},
		],
		default: 'list',
	},
	...create.description,
	...del.description,
	...get.description,
	// ...getStatistics.description,
	...list.description,
	...update.description,
];
