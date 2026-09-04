import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getStatistics from './getStatistics.operation';
import * as list from './list.operation';
import * as update from './update.operation';

export { get, getStatistics, list, update };

export const description: INodeProperties[] = [
	...get.description,
	...list.description,
	...update.description,
];
