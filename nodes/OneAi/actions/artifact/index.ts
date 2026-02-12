import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as exportPdf from './exportPdf.operation';
import * as getMarkdown from './getMarkdown.operation';
import * as listAll from './listAll.operation';
import * as listBySpace from './listBySpace.operation';

export { create, del as delete, exportPdf, getMarkdown, listAll, listBySpace };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['artifact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an artifact from a file',
				action: 'Create an artifact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an artifact from a space',
				action: 'Delete an artifact',
			},
			{
				name: 'Export PDF',
				value: 'exportPdf',
				description: 'Export an artifact as a PDF',
				action: 'Export artifact as PDF',
			},
			{
				name: 'Get Markdown',
				value: 'getMarkdown',
				description: 'Get the markdown content of an artifact',
				action: 'Get artifact markdown',
			},
			{
				name: 'List All',
				value: 'listAll',
				description: 'List all artifacts with optional filtering',
				action: 'List all artifacts',
			},
			{
				name: 'List by Space',
				value: 'listBySpace',
				description: 'List artifacts in a specific space',
				action: 'List artifacts in space',
			},
		],
		default: 'listAll',
	},
	...create.description,
	...del.description,
	...exportPdf.description,
	...getMarkdown.description,
	...listAll.description,
	...listBySpace.description,
];
