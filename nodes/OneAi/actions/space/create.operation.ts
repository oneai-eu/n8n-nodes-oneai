import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';
import { PROVIDER_OPTIONS, resolveProvider } from './providers';

/**
 * `POST /api/spaces` takes `{ name, provider, providerOptions }` and is
 * `additionalProperties: false`. Two things were wrong here and neither was visible to a
 * path-level check, because the path never changed:
 *
 *   - the per-provider fields (`authCode`, `driveId`, `owner`, `repo`, `branch`) were sent
 *     flat. They live under `providerOptions`, an `anyOf` selected by `provider`;
 *   - `providerOptions` is REQUIRED even when it is empty, so a space with no options - which
 *     includes `seaweed` and `oneData`, the two most useful ones from a workflow - could not
 *     be created at all.
 *
 * The `provider` values were wrong as well: the node offered `local`, `google`, `onedrive`,
 * `sharepoint` and `github`, of which only `github` is in the enum the API accepts.
 */

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the space',
		displayOptions: {
			show: {
				resource: ['space'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Provider',
		name: 'provider',
		type: 'options',
		required: true,
		default: 'seaweed',
		description:
			'Storage provider for the space. Providers that authenticate through OAuth additionally need an authorization code and a signed state, both issued by oneAI outside n8n.',
		options: PROVIDER_OPTIONS,
		displayOptions: {
			show: {
				resource: ['space'],
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
				resource: ['space'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Auth Code',
				name: 'authCode',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Authorization code for cloud storage linking',
			},
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: '',
				description: 'Branch name for GitHub',
			},
			{
				displayName: 'Drive ID',
				name: 'driveId',
				type: 'string',
				default: '',
				description: 'Drive ID for OneDrive/SharePoint',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				default: '',
				description: 'Repository owner for GitHub',
			},
			{
				displayName: 'Provider Options (JSON)',
				name: 'providerOptionsJson',
				type: 'json',
				default: '',
				description:
					'Provider options for providers this node does not model as individual fields, as a JSON object. Merged with the fields above, which win on conflict.',
			},
			{
				displayName: 'Repository',
				name: 'repo',
				type: 'string',
				default: '',
				description: 'Repository name for GitHub',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Signed state issued by oneAI. Required for OAuth providers.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', index) as string;
	const providerParameter = this.getNodeParameter('provider', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as {
		authCode?: string;
		driveId?: string;
		owner?: string;
		repo?: string;
		branch?: string;
		state?: string;
		providerOptionsJson?: string;
	};

	const provider = resolveProvider(providerParameter);

	let providerOptions: IDataObject = {};
	if (additionalFields.providerOptionsJson) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(additionalFields.providerOptionsJson);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Provider Options (JSON) is not valid JSON', {
				itemIndex: index,
			});
		}
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw new NodeOperationError(
				this.getNode(),
				'Provider Options (JSON) must be a JSON object',
				{ itemIndex: index },
			);
		}
		providerOptions = parsed as IDataObject;
	}

	if (additionalFields.authCode) {
		providerOptions.authCode = additionalFields.authCode;
	}
	if (additionalFields.driveId) {
		providerOptions.driveId = additionalFields.driveId;
	}
	if (additionalFields.owner) {
		providerOptions.owner = additionalFields.owner;
	}
	if (additionalFields.repo) {
		providerOptions.repo = additionalFields.repo;
	}
	if (additionalFields.branch) {
		providerOptions.branch = additionalFields.branch;
	}

	// `providerOptions` is required, and is `{}` for the providers that take no options.
	const body: {
		name: string;
		provider: string;
		providerOptions: IDataObject;
		state?: string;
	} = {
		name,
		provider,
		providerOptions,
	};

	if (additionalFields.state) {
		body.state = additionalFields.state;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/spaces',
		body,
	});

	return this.helpers.returnJsonArray(response).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
