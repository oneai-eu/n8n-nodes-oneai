import type { INodeProperties } from 'n8n-workflow';

import * as archive from './archive.operation';
import * as get from './get.operation';
import * as instantiateTemplate from './instantiateTemplate.operation';
import * as list from './list.operation';
import * as unarchive from './unarchive.operation';
import * as update from './update.operation';

export { archive, get, instantiateTemplate, list, unarchive, update };

export const description: INodeProperties[] = [
	...archive.description,
	...get.description,
	...instantiateTemplate.description,
	...list.description,
	...unarchive.description,
	...update.description,
];
