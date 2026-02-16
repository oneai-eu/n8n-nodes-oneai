import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OneAiApi implements ICredentialType {
	name = 'oneAiApi';

	displayName = 'OneAI API';

	icon = 'file:oneai.svg' as const;

	documentationUrl = 'https://oneai.eu';

	properties: INodeProperties[] = [
		{
			displayName: 'OneAI URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://hub.oneai.eu',
			description: 'The base URL of your OneAI instance',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Your OneAI User API Key (can be generated in the hub settings)',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/api/auth/check',
			method: 'GET',
		},
	};
}
