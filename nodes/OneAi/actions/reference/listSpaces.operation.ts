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
				operation: ['listSpaces'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search query to filter spaces',
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
	};

	const qs: {
		search?: string;
	} = {};

	if (options.search) {
		qs.search = options.search;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/references/spaces',
		qs,
	});

	return this.helpers.returnJsonArray(response);
}
