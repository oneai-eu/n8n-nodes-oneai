import type { INodeProperties } from 'n8n-workflow';

import * as append from './append.operation';
import * as appendMany from './appendMany.operation';
import * as del from './delete.operation';
import * as list from './list.operation';
import * as update from './update.operation';

export { append, appendMany, del as delete, list, update };

export const description: INodeProperties[] = [
	...append.description,
	...appendMany.description,
	...del.description,
	...list.description,
	...update.description,
];
