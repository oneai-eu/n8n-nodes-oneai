import type { INodeProperties } from 'n8n-workflow';

import * as checkAuth from './check.operation';

export { checkAuth };

export const description: INodeProperties[] = [
	...checkAuth.description,
];
