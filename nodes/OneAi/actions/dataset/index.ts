import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as exportCsv from './exportCsv.operation';
import * as importCsv from './importCsv.operation';
import * as list from './list.operation';
import * as listSpaces from './listSpaces.operation';
import * as updateSchema from './updateSchema.operation';

export { create, exportCsv, importCsv, list, listSpaces, updateSchema };

export const description: INodeProperties[] = [
	...create.description,
	...exportCsv.description,
	...importCsv.description,
	...list.description,
	...listSpaces.description,
	...updateSchema.description,
];
