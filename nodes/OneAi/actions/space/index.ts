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
import * as uploadFile from './uploadFile.operation';

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
	uploadFile,
};

export const description: INodeProperties[] = [
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
	...uploadFile.description,
];
