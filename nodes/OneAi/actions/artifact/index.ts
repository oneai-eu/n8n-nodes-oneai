import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as exportPdf from './exportPdf.operation';
import * as getMarkdown from './getMarkdown.operation';
import * as listAll from './listAll.operation';
import * as listBySpace from './listBySpace.operation';

export { create, del as delete, exportPdf, getMarkdown, listAll, listBySpace };

export const description: INodeProperties[] = [
	...create.description,
	...del.description,
	...exportPdf.description,
	...getMarkdown.description,
	...listAll.description,
	...listBySpace.description,
];
