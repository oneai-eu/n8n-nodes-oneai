import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequestRaw } from '../../transport';

/**
 * Artifact export changed shape entirely: it was
 * `POST /api/spaces/{spaceId}/artifacts/export/{artifactId}` returning JSON, and is now
 * `GET /api/spaces/{spaceId}/artifacts/{artifactId}/pdf` returning the PDF bytes. Different
 * path, different method, different response kind.
 *
 * The old `mermaidSvgs` option is gone with the request body - the endpoint takes no body at
 * all now, and the server renders the diagrams itself.
 */
const OUTPUT_MIME_TYPE = 'application/pdf';

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
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The binary property name to write the exported PDF to',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['exportPdf'],
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

	const pdf = await oneAiApiRequestRaw.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/artifacts/${encodeURIComponent(artifactId)}/pdf`,
	});

	const binaryData = await this.helpers.prepareBinaryData(
		pdf,
		`${artifactId}.pdf`,
		OUTPUT_MIME_TYPE,
	);

	return [
		{
			json: {
				spaceId,
				artifactId,
				fileName: `${artifactId}.pdf`,
				mimeType: OUTPUT_MIME_TYPE,
			},
			binary: { [binaryPropertyName]: binaryData },
			pairedItem: { item: index },
		},
	];
}
