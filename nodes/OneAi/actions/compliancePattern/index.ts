import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deletePattern from './delete.operation';
import * as edit from './edit.operation';
import * as list from './list.operation';
import * as setEnabled from './setEnabled.operation';

export { create, deletePattern, edit, list, setEnabled };

export const description: INodeProperties[] = [
	...list.description,
	...create.description,
	...edit.description,
	...setEnabled.description,
	...deletePattern.description,
];
