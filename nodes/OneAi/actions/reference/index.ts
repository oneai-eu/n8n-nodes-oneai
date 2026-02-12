import type { INodeProperties } from 'n8n-workflow';

import * as listFiles from './listFiles.operation';
import * as listSpaces from './listSpaces.operation';

export { listFiles, listSpaces };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['reference'],
			},
		},
		options: [
			{
				name: 'List Files',
				value: 'listFiles',
				description: 'List files accessible for attaching as references',
				action: 'List reference files',
			},
			{
				name: 'List Spaces',
				value: 'listSpaces',
				description: 'List spaces accessible for attaching as references',
				action: 'List reference spaces',
			},
		],
		default: 'listSpaces',
	},
	...listFiles.description,
	...listSpaces.description,
];
