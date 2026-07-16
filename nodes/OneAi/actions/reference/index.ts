import type { INodeProperties } from 'n8n-workflow';

import * as listFiles from './listFiles.operation';
import * as listSpaces from './listSpaces.operation';

export { listFiles, listSpaces };

export const description: INodeProperties[] = [
	...listFiles.description,
	...listSpaces.description,
];
