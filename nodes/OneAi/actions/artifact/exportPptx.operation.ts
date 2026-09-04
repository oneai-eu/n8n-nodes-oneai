import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequestRaw } from '../../transport';

/**
 * `GET /api/spaces/{spaceId}/artifacts/{artifactId}/pptx`, responding
 * `application/octet-stream` - the presentation sibling of `artifact:exportPdf`, and built the
 * same way: raw bytes through `oneAiApiRequestRaw`, wrapped with `prepareBinaryData` so the file
 * can go straight into any n8n node that takes binary data.
 *
 * The endpoint takes no body and no options; the server renders the deck itself.
 */
const OUTPUT_MIME_TYPE =
	'application/vnd.openxmlformats-officedocument.presentationml.presentation';

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
				operation: ['exportPptx'],
			},
		},
	},
	{
		displayName: 'Artifact ID',
		name: 'artifactId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the presentation artifact to export',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['exportPptx'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The binary property name to write the exported PPTX to',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['exportPptx'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const artifactId = this.getNodeParameter('artifactId', index) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;

	const pptx = await oneAiApiRequestRaw.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/artifacts/${encodeURIComponent(artifactId)}/pptx`,
	});

	const binaryData = await this.helpers.prepareBinaryData(
		pptx,
		`${artifactId}.pptx`,
		OUTPUT_MIME_TYPE,
	);

	return [
		{
			json: {
				spaceId,
				artifactId,
				fileName: `${artifactId}.pptx`,
				mimeType: OUTPUT_MIME_TYPE,
			},
			binary: { [binaryPropertyName]: binaryData },
			pairedItem: { item: index },
		},
	];
}
