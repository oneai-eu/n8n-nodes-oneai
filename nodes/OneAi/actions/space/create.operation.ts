import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

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
		default: 'local',
		description: 'Storage provider for the space',
		options: [
			{
				name: 'GitHub',
				value: 'github',
			},
			{
				name: 'Google Drive',
				value: 'google',
			},
			{
				name: 'Local',
				value: 'local',
			},
			{
				name: 'OneDrive',
				value: 'onedrive',
			},
			{
				name: 'SharePoint',
				value: 'sharepoint',
			},
		],
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
				displayName: 'Repository',
				name: 'repo',
				type: 'string',
				default: '',
				description: 'Repository name for GitHub',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', index) as string;
	const provider = this.getNodeParameter('provider', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as {
		authCode?: string;
		driveId?: string;
		owner?: string;
		repo?: string;
		branch?: string;
	};

	const body: {
		name: string;
		provider: string;
		authCode?: string;
		driveId?: string;
		owner?: string;
		repo?: string;
		branch?: string;
	} = {
		name,
		provider,
	};

	if (additionalFields.authCode) {
		body.authCode = additionalFields.authCode;
	}
	if (additionalFields.driveId) {
		body.driveId = additionalFields.driveId;
	}
	if (additionalFields.owner) {
		body.owner = additionalFields.owner;
	}
	if (additionalFields.repo) {
		body.repo = additionalFields.repo;
	}
	if (additionalFields.branch) {
		body.branch = additionalFields.branch;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: '/api/spaces',
		body,
	});

	return this.helpers.returnJsonArray(response);
}
