import type { INodeProperties } from 'n8n-workflow';

import * as getCurrent from './getCurrent.operation';
import * as getStatistics from './getStatistics.operation';
import * as update from './update.operation';
import * as updateCompliance from './updateCompliance.operation';

export { getCurrent, getStatistics, update, updateCompliance };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organization'],
			},
		},
		options: [
			{
				name: 'Get Current',
				value: 'getCurrent',
				description: 'Get the current organization details',
				action: 'Get current organization',
			},
			{
				name: 'Get Statistics',
				value: 'getStatistics',
				description: 'Get organization statistics',
				action: 'Get organization statistics',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update organization profile',
				action: 'Update organization',
			},
			{
				name: 'Update Compliance',
				value: 'updateCompliance',
				description: 'Update compliance settings',
				action: 'Update compliance settings',
			},
		],
		default: 'getCurrent',
	},
	...getCurrent.description,
	...getStatistics.description,
	...update.description,
	...updateCompliance.description,
];
