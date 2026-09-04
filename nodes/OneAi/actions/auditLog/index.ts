import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as list from './list.operation';

export { get, list };

export const description: INodeProperties[] = [...get.description, ...list.description];
