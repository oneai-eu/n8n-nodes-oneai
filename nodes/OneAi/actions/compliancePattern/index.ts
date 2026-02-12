import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as edit from './edit.operation';
import * as list from './list.operation';
import * as toggleEnabled from './toggleEnabled.operation';

export { create, del as delete, edit, list, toggleEnabled };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new custom pattern',
				action: 'Create a compliance pattern',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an organization pattern',
				action: 'Delete a compliance pattern',
			},
			{
				name: 'Edit',
				value: 'edit',
				description: 'Edit a custom pattern',
				action: 'Edit a compliance pattern',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all patterns (default + custom)',
				action: 'List all compliance patterns',
			},
			{
				name: 'Toggle Enabled',
				value: 'toggleEnabled',
				description: 'Enable or disable a pattern',
				action: 'Toggle pattern enabled',
			},
		],
		default: 'list',
	},
	...create.description,
	...del.description,
	...edit.description,
	...list.description,
	...toggleEnabled.description,
];
