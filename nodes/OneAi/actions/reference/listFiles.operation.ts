import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['reference'],
				operation: ['listFiles'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search query to filter files',
			},
			{
				displayName: 'Space ID',
				name: 'spaceId',
				type: 'string',
				default: '',
				description: 'Limit results to a specific space',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', index) as {
		search?: string;
		spaceId?: string;
	};

	const qs: {
		search?: string;
		spaceId?: string;
	} = {};

	if (options.search) {
		qs.search = options.search;
	}
	if (options.spaceId) {
		qs.spaceId = options.spaceId;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/references/files',
		qs,
	});

	return this.helpers.returnJsonArray(response);
}
