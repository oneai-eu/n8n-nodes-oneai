import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space containing the artifact',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['exportPdf'],
			},
		},
	},
	{
		displayName: 'Artifact ID',
		name: 'artifactId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the artifact to export',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['exportPdf'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['exportPdf'],
			},
		},
		options: [
			{
				displayName: 'Mermaid SVGs',
				name: 'mermaidSvgs',
				type: 'string',
				default: '',
				description: 'Comma-separated list of pre-rendered Mermaid diagram SVGs',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const artifactId = this.getNodeParameter('artifactId', index) as string;
	const options = this.getNodeParameter('options', index) as {
		mermaidSvgs?: string;
	};

	const body: {
		mermaidSvgs?: string[];
	} = {};

	if (options.mermaidSvgs) {
		body.mermaidSvgs = options.mermaidSvgs.split(',').map((s) => s.trim());
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${spaceId}/artifacts/export/${artifactId}`,
		body,
	});

	return this.helpers.returnJsonArray(response);
}
