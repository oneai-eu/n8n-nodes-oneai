import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import { readTables } from './helpers';

/**
 * `GET /api/spaces/{spaceId}/tables` takes no query parameters and returns every table in one
 * response, so there is deliberately no `returnAll`/`limit` pair here: faking pagination over an
 * endpoint that does not paginate would be a lie the next maintainer has to unpick.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space holding the datasets',
		displayOptions: {
			show: {
				resource: ['dataset'],
				operation: ['list'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/spaces/${encodeURIComponent(spaceId)}/tables`,
	});

	const tables = readTables(response).map((table) => ({ ...table, spaceId }));

	return this.helpers.returnJsonArray(tables).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
