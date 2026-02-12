import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getModels from './getModels.operation';
import * as list from './list.operation';
import * as update from './update.operation';

export { create, del as delete, get, getModels, list, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new chat',
				action: 'Create a chat',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a chat',
				action: 'Delete a chat',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get chat history',
				action: 'Get a chat',
			},
			{
				name: 'Get Models',
				value: 'getModels',
				description: 'List available models',
				action: 'Get available models',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List chats with optional filtering',
				action: 'List all chats',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update chat details (rename or move)',
				action: 'Update a chat',
			},
		],
		default: 'list',
	},
	...create.description,
	...del.description,
	...get.description,
	...getModels.description,
	...list.description,
	...update.description,
];
