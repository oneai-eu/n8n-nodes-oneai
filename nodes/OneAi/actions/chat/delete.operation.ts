import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the chat to delete',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['delete'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const chatId = this.getNodeParameter('chatId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'DELETE',
		endpoint: `/api/chats/${chatId}`,
	});

	return this.helpers.returnJsonArray(response);
}
