import type { INodeProperties } from 'n8n-workflow';

import * as createResponse from './createResponse.operation';

export { createResponse };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['openai'],
			},
		},
		options: [
			{
				name: 'Create Response',
				value: 'createResponse',
				description: 'Send a message to an AI model and get a response',
				action: 'Create a response',
			},
		],
		default: 'createResponse',
	},
	...createResponse.description,
];
