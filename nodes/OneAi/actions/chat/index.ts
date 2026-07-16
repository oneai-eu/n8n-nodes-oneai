import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as update from './update.operation';

export { create, del as delete, get, list, update };

export const description: INodeProperties[] = [
	...create.description,
	...del.description,
	...get.description,
	...list.description,
	...update.description,
];
