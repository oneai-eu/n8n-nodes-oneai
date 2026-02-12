import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the organization',
		displayOptions: {
			show: {
				resource: ['organization'],
				operation: ['update'],
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
				resource: ['organization'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Organization description',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Organization website URL',
			},
			{
				displayName: 'Theme Color',
				name: 'themeColor',
				type: 'string',
				default: '',
				description: 'Theme color for the organization',
			},
			{
				displayName: 'Logo URL',
				name: 'logo',
				type: 'string',
				default: '',
				description: 'URL of the organization logo',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as {
		description?: string;
		website?: string;
		themeColor?: string;
		logo?: string;
	};

	const body: {
		name: string;
		description?: string | null;
		website?: string | null;
		themeColor?: string | null;
		logo?: string;
	} = {
		name,
		description: additionalFields.description ?? null,
		website: additionalFields.website ?? null,
		themeColor: additionalFields.themeColor ?? null,
	};

	if (additionalFields.logo) {
		body.logo = additionalFields.logo;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'PUT',
		endpoint: '/api/orgs/current',
		body,
	});

	return this.helpers.returnJsonArray(response);
}
