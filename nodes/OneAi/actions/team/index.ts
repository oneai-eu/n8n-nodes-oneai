import type { INodeProperties } from 'n8n-workflow';

import * as addMember from './addMember.operation';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as listMembers from './listMembers.operation';
import * as removeMember from './removeMember.operation';

export { addMember, create, del as delete, get, list, listMembers, removeMember };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['team'],
			},
		},
		options: [
			{
				name: 'Add Member',
				value: 'addMember',
				description: 'Add a member to a team',
				action: 'Add a member to a team',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new team',
				action: 'Create a team',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a team',
				action: 'Delete a team',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a team by ID',
				action: 'Get a team',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all teams',
				action: 'List all teams',
			},
			{
				name: 'List Members',
				value: 'listMembers',
				description: 'List members in a team',
				action: 'List members in a team',
			},
			{
				name: 'Remove Member',
				value: 'removeMember',
				description: 'Remove a member from a team',
				action: 'Remove a member from a team',
			},
		],
		default: 'list',
	},
	...addMember.description,
	...create.description,
	...del.description,
	...get.description,
	...list.description,
	...listMembers.description,
	...removeMember.description,
];
