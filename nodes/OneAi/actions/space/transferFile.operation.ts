import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the source space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['transferFile'],
			},
		},
	},
	{
		displayName: 'Source Path',
		name: 'sourcePath',
		type: 'string',
		required: true,
		default: '',
		description: 'The path of the source file',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['transferFile'],
			},
		},
	},
	{
		displayName: 'Target Space ID',
		name: 'targetSpaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the target space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['transferFile'],
			},
		},
	},
	{
		displayName: 'Target Path',
		name: 'targetPath',
		type: 'string',
		required: true,
		default: '',
		description: 'The path in the target space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['transferFile'],
			},
		},
	},
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		required: true,
		default: 'copy',
		description: 'Whether to copy or move the file',
		options: [
			{
				name: 'Copy',
				value: 'copy',
			},
			{
				name: 'Move',
				value: 'move',
			},
		],
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['transferFile'],
			},
		},
	},
	{
		displayName: 'Replace',
		name: 'replace',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether to replace the file if it exists',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['transferFile'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const sourcePath = this.getNodeParameter('sourcePath', index) as string;
	const targetSpaceId = this.getNodeParameter('targetSpaceId', index) as string;
	const targetPath = this.getNodeParameter('targetPath', index) as string;
	const mode = this.getNodeParameter('mode', index) as string;
	const replace = this.getNodeParameter('replace', index) as boolean;

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${spaceId}/files/transfer`,
		body: {
			sourcePath,
			targetSpaceId,
			targetPath,
			mode,
			replace,
		},
	});

	return this.helpers.returnJsonArray(response);
}
