import type { INodeProperties } from 'n8n-workflow';

import * as addTeam from './addTeam.operation';
import * as addUser from './addUser.operation';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as deleteFile from './deleteFile.operation';
import * as downloadFile from './downloadFile.operation';
import * as embedFiles from './embedFiles.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as listFiles from './listFiles.operation';
import * as listTeams from './listTeams.operation';
import * as listUsers from './listUsers.operation';
import * as removeTeam from './removeTeam.operation';
import * as removeUser from './removeUser.operation';
import * as sync from './sync.operation';
import * as transferFile from './transferFile.operation';

export {
	addTeam,
	addUser,
	create,
	del as delete,
	deleteFile,
	downloadFile,
	embedFiles,
	get,
	list,
	listFiles,
	listTeams,
	listUsers,
	removeTeam,
	removeUser,
	sync,
	transferFile,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['space'],
			},
		},
		options: [
			{
				name: 'Add Team',
				value: 'addTeam',
				description: 'Add a team to a space',
				action: 'Add team to space',
			},
			{
				name: 'Add User',
				value: 'addUser',
				description: 'Add a user to a space',
				action: 'Add user to space',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new space',
				action: 'Create a space',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a space',
				action: 'Delete a space',
			},
			{
				name: 'Delete File',
				value: 'deleteFile',
				description: 'Delete a file from a space',
				action: 'Delete file from space',
			},
			{
				name: 'Download File',
				value: 'downloadFile',
				description: 'Download a file from a space',
				action: 'Download file from space',
			},
			{
				name: 'Embed Files',
				value: 'embedFiles',
				description: 'Queue files/folders for embedding',
				action: 'Embed files in space',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a space by ID',
				action: 'Get a space',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all spaces',
				action: 'List all spaces',
			},
			{
				name: 'List Files',
				value: 'listFiles',
				description: 'List files in a space',
				action: 'List files in space',
			},
			{
				name: 'List Teams',
				value: 'listTeams',
				description: 'List teams assigned to a space',
				action: 'List teams in space',
			},
			{
				name: 'List Users',
				value: 'listUsers',
				description: 'List users assigned to a space',
				action: 'List users in space',
			},
			{
				name: 'Remove Team',
				value: 'removeTeam',
				description: 'Remove a team from a space',
				action: 'Remove team from space',
			},
			{
				name: 'Remove User',
				value: 'removeUser',
				description: 'Remove a user from a space',
				action: 'Remove user from space',
			},
			{
				name: 'Sync',
				value: 'sync',
				description: 'Synchronize a linked space',
				action: 'Sync a space',
			},
			{
				name: 'Transfer File',
				value: 'transferFile',
				description: 'Move or copy a file between spaces',
				action: 'Transfer file between spaces',
			},
		],
		default: 'list',
	},
	...addTeam.description,
	...addUser.description,
	...create.description,
	...del.description,
	...deleteFile.description,
	...downloadFile.description,
	...embedFiles.description,
	...get.description,
	...list.description,
	...listFiles.description,
	...listTeams.description,
	...listUsers.description,
	...removeTeam.description,
	...removeUser.description,
	...sync.description,
	...transferFile.description,
];
