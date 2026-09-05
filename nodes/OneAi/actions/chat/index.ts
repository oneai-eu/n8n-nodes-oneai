import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as exportOp from './export.operation';
import * as get from './get.operation';
import * as getBlob from './getBlob.operation';
import * as getBlobUrl from './getBlobUrl.operation';
import * as list from './list.operation';
import * as rateMessage from './rateMessage.operation';
import * as saveBlobToSpace from './saveBlobToSpace.operation';
import * as update from './update.operation';

// `delete` and `export` are reserved words, so both are imported under a local alias and exported
// under the operation value the router and `modes.ts` use. Both structural checkers read this
// aliasing form.
export {
	create,
	del as delete,
	exportOp as export,
	get,
	getBlob,
	getBlobUrl,
	list,
	rateMessage,
	saveBlobToSpace,
	update,
};

export const description: INodeProperties[] = [
	...create.description,
	...del.description,
	...exportOp.description,
	...get.description,
	...getBlob.description,
	...getBlobUrl.description,
	...list.description,
	...rateMessage.description,
	...saveBlobToSpace.description,
	...update.description,
];
