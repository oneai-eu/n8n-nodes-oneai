import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Pattern ID',
		name: 'patternId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the custom pattern to delete. Default patterns cannot be deleted.',
		displayOptions: {
			show: {
				resource: ['compliancePattern'],
				operation: ['delete'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const patternId = this.getNodeParameter('patternId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'DELETE',
		endpoint: `/api/compliance/pattern/${encodeURIComponent(patternId)}`,
	});

	return [
		{
			json: response,
			pairedItem: { item: index },
		},
	];
}
