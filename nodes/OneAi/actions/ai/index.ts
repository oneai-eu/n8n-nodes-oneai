import type { INodeProperties } from 'n8n-workflow';

import * as createResponse from './createResponse.operation';
import * as listModels from './listModels.operation';

export { createResponse, listModels };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['ai'],
			},
		},
		options: [
			{
				name: 'Create Response',
				value: 'createResponse',
				description: 'Send a message to an AI model and get a response',
				action: 'Create a response',
			},
			{
				name: 'List Available AI Models',
				value: 'listModels',
				description: 'List all available AI models',
				action: 'List available AI models',
			},
		],
		default: 'createResponse',
	},
	...createResponse.description,
	...listModels.description,
];
