import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as getStatistics from './getStatistics.operation';
import * as list from './list.operation';
import * as resetRecovery from './resetRecovery.operation';
import * as update from './update.operation';

export { create, del as delete, getStatistics, list, resetRecovery, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['member'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Add a new member to the organization',
				action: 'Create a member',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an organization member',
				action: 'Delete a member',
			},
			{
				name: 'Get Statistics',
				value: 'getStatistics',
				description: 'Get organization members statistics',
				action: 'Get member statistics',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all organization members',
				action: 'List all members',
			},
			{
				name: 'Reset Recovery',
				value: 'resetRecovery',
				description: 'Reset user recovery code',
				action: 'Reset recovery code',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an organization member',
				action: 'Update a member',
			},
		],
		default: 'list',
	},
	...create.description,
	...del.description,
	...getStatistics.description,
	...list.description,
	...resetRecovery.description,
	...update.description,
];
