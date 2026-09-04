import type { INodeProperties } from 'n8n-workflow';

import * as exportOp from './export.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as review from './review.operation';

// `export` is a reserved word, so the module is imported under a local alias and re-exported
// under the operation value the router and `modes.ts` use. `chat` does the same for its own
// `export`, and both structural checkers read this aliasing form.
export { exportOp as export, get, list, review };

export const description: INodeProperties[] = [
	...exportOp.description,
	...get.description,
	...list.description,
	...review.description,
];
