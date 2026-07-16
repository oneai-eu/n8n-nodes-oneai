import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OneAiApi implements ICredentialType {
	name = 'oneAiApi';

	displayName = 'oneAI API';

	icon = 'file:oneai.svg' as const;

	documentationUrl = 'https://oneai.eu';

	properties: INodeProperties[] = [
		{
			displayName: 'oneAI URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://hub.oneai.eu',
			description: 'The base URL of your oneAI instance',
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
			description:
				'Your oneAI API key (generated in the hub settings). Gateway-plan keys start with "oai-gk_" and are validated against the oneAI Gateway; all other keys ("oai_") are validated against the hub.',
			required: true,
		},
		{
			displayName: 'Gateway Only',
			name: 'gatewayOnly',
			type: 'boolean',
			default: false,
			description:
				'Whether to expose only the oneAI Gateway features (AI inference: chat, image generation, embeddings, transcription). When off, the full hub feature set is available (projects, spaces, artifacts, etc.). Switching this on hides hub-only resources; if a workflow was built against the hub, you may need to re-select the resource.',
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

	// Gateway-plan keys ("oai-gk_") only reach the oneAI Gateway, so validate
	// them against a gateway GET endpoint (`/api/openai/v1/models`) rather than
	// the hub. Hub keys ("oai_") keep being validated against `/api/auth/check`.
	// Testing each key against the surface it is actually used on avoids a false
	// "success" for a gateway key whose org would 402 on every inference call.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '={{ ($credentials.apiKey || "").startsWith("oai-gk_") ? "/api/openai/v1/models" : "/api/auth/check" }}',
			method: 'GET',
		},
	};
}
