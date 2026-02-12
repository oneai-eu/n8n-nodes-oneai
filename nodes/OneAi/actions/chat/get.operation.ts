import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the chat to get',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['get'],
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
				resource: ['chat'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 50,
				description: 'Number of messages to return per page',
			},
			{
				displayName: 'Branch ID',
				name: 'branchId',
				type: 'string',
				default: '',
				description: 'The ID of the branch to get (by default, get the current branch)',
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'string',
				default: '',
				description: 'Cursor timestamp (ISO date) - return messages before this timestamp',
			},
			{
				displayName: 'After',
				name: 'after',
				type: 'string',
				default: '',
				description: 'Cursor timestamp (ISO date) - return messages after this timestamp',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const chatId = this.getNodeParameter('chatId', index) as string;
	const options = this.getNodeParameter('options', index) as {
		pageSize?: number;
		branchId?: string;
		before?: string;
		after?: string;
	};

	const qs: {
		pageSize?: number;
		branchId?: string;
		before?: string;
		after?: string;
	} = {};

	if (options.pageSize) {
		qs.pageSize = options.pageSize;
	}
	if (options.branchId) {
		qs.branchId = options.branchId;
	}
	if (options.before) {
		qs.before = options.before;
	}
	if (options.after) {
		qs.after = options.after;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/chats/${chatId}`,
		qs,
	});

	return this.helpers.returnJsonArray(response);
}
