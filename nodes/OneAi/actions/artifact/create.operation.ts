import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Space ID',
		name: 'spaceId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the space to add the artifact to',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the artifact',
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['artifact'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Source Chat ID',
				name: 'sourceChatId',
				type: 'string',
				default: '',
				description: 'The ID of the source chat',
			},
			{
				displayName: 'Source Message ID',
				name: 'sourceMessageId',
				type: 'string',
				default: '',
				description: 'The ID of the source message',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const spaceId = this.getNodeParameter('spaceId', index) as string;
	const name = this.getNodeParameter('name', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as {
		sourceChatId?: string;
		sourceMessageId?: string;
	};

	const body: {
		name: string;
		source?: {
			chatId: string;
			messageId: string;
		};
	} = {
		name,
	};

	if (additionalFields.sourceChatId && additionalFields.sourceMessageId) {
		body.source = {
			chatId: additionalFields.sourceChatId,
			messageId: additionalFields.sourceMessageId,
		};
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/spaces/${spaceId}/artifacts`,
		body,
	});

	return this.helpers.returnJsonArray(response);
}
