import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequestRaw } from '../../transport';

/**
 * `GET /api/spaces/{spaceId}/files/download` responds `application/octet-stream`, and this
 * operation used to read it through the JSON helper and hand the result to
 * `returnJsonArray` - the same defect `artifact.exportPdf` had.
 *
 * No drift tier can see this one. Tier 1 passes because the path still resolves and tier 3
 * passes because there is no request body to compare; it is a RESPONSE-shape defect, which
 * `docs/DRIFT-2026-09-03.md` names as the checker's largest blind spot. It was found by
 * sweeping every dispatched call for a mismatch between the spec's declared 200 content type
 * and the transport helper used - one mismatch in 57 calls, and this was it.
 */

export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['downloadFile'],
			},
		},
	},
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		default: '',
		description: 'The path of the file to download',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['downloadFile'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The binary property name to write the downloaded file to',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['downloadFile'],
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
				resource: ['space'],
				operation: ['downloadFile'],
			},
		},
		options: [
			{
				displayName: 'Convert',
				name: 'convert',
				type: 'boolean',
				default: false,
				description: 'Whether to convert to browser-compatible format if possible',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const path = this.getNodeParameter('path', index) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const options = this.getNodeParameter('options', index) as {
		convert?: boolean;
	};

	const qs: {
		path: string;
		convert?: boolean;
	} = {
		path,
	};

	if (options.convert !== undefined) {
		qs.convert = options.convert;
	}

	const file = await oneAiApiRequestRaw.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${spaceId}/files/download`,
		qs,
	});

	const fileName = path.split('/').pop() || 'download';
	const binaryData = await this.helpers.prepareBinaryData(file, fileName);

	return [
		{
			json: { spaceId, path, fileName },
			binary: { [binaryPropertyName]: binaryData },
			pairedItem: { item: index },
		},
	];
}
