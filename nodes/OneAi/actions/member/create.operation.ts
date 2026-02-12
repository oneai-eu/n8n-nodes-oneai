import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		description: 'Email address of the new member',
		displayOptions: {
			show: {
				resource: ['member'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Is Admin',
		name: 'isAdmin',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether the member should have admin privileges',
		displayOptions: {
			show: {
				resource: ['member'],
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
				resource: ['member'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'SSO Provider',
				name: 'ssoProvider',
				type: 'string',
				default: '',
				description: 'SSO provider name if using SSO authentication',
			},
			{
				displayName: 'SSO ID',
				name: 'ssoId',
				type: 'string',
				default: '',
				description: 'SSO identifier for the user',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const email = this.getNodeParameter('email', index) as string;
	const isAdmin = this.getNodeParameter('isAdmin', index) as boolean;
	const additionalFields = this.getNodeParameter('additionalFields', index) as {
		ssoProvider?: string;
		ssoId?: string;
	};

	const body: {
		email: string;
		isAdmin: boolean;
		sso?: {
			provider: string;
			id: string;
		};
	} = {
		email,
		isAdmin,
	};

	if (additionalFields.ssoProvider && additionalFields.ssoId) {
		body.sso = {
			provider: additionalFields.ssoProvider,
			id: additionalFields.ssoId,
		};
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/members',
		body,
	});

	return this.helpers.returnJsonArray(response);
}
