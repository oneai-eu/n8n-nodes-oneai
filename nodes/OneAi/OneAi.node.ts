import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as artifact from './actions/artifact';
import * as chat from './actions/chat';
import * as ai from './actions/ai';
import * as compliancePattern from './actions/compliancePattern';
import * as checkAuth from './actions/misc';
import * as project from './actions/project';
import * as reference from './actions/reference';
import { router } from './actions/router';
import * as space from './actions/space';
import { filterOperations, filterResources } from './modes';

export class OneAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OneAI',
		name: 'oneAi',
		icon: 'file:oneai.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the OneAI API',
		defaults: {
			name: 'OneAI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'oneAiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource Name or ID',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getResources',
				},
				default: 'ai',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Operation Name or ID',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getOperations',
					loadOptionsDependsOn: ['resource'],
				},
				default: 'createResponse',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			...artifact.description,
			...checkAuth.description,
			...chat.description,
			...ai.description,
			...compliancePattern.description,
			...project.description,
			...reference.description,
			...space.description,
		],
		usableAsTool: true,
	};

	methods = {
		loadOptions: {
			async getResources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let gatewayOnly = false;
				try {
					const credentials = await this.getCredentials('oneAiApi');
					gatewayOnly = credentials.gatewayOnly === true;
				} catch {
					// No credentials yet — show everything so first-time setup works
				}
				return filterResources(gatewayOnly);
			},
			async getOperations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resource = this.getCurrentNodeParameter('resource') as string;
				if (!resource) return [];
				let gatewayOnly = false;
				try {
					const credentials = await this.getCredentials('oneAiApi');
					gatewayOnly = credentials.gatewayOnly === true;
				} catch {
					// No credentials yet — show everything
				}
				return filterOperations(resource, gatewayOnly);
			},
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const credentials = await this.getCredentials('oneAiApi');
					const baseUrl = (credentials.url as string).replace(/\/$/, '');
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneAiApi',
						{
							method: 'GET',
							url: `${baseUrl}/api/chats/models`,
							headers: { Accept: 'application/json' },
						},
					);
					const models = response as Array<{
						id: string;
						name: string;
						description: string;
					}>;
					return models.map((m) => ({
						name: m.name,
						value: m.id,
						description: m.description,
					}));
				} catch {
					return [{ name: 'Unauthenticated', value: '' }];
				}
			},
			async getImageModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const credentials = await this.getCredentials('oneAiApi');
					const baseUrl = (credentials.url as string).replace(/\/$/, '');
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'oneAiApi',
						{
							method: 'GET',
							url: `${baseUrl}/api/image-models`,
							headers: { Accept: 'application/json' },
						},
					);
					const { models, defaultModelId } = response as {
						models: Array<{ id: string; name: string; provider: string; isDefault: boolean }>;
						defaultModelId: string;
					};
					const options: INodePropertyOptions[] = [
						{
							name: `Organization Default${defaultModelId ? ` (${defaultModelId})` : ''}`,
							value: '',
							description: 'Use the organization default image model',
						},
					];
					for (const m of models) {
						options.push({
							name: `${m.name}${m.isDefault ? ' (default)' : ''}`,
							value: m.id,
							description: `Provider: ${m.provider}`,
						});
					}
					return options;
				} catch {
					return [{ name: 'Unauthenticated', value: '' }];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return router.call(this);
	}
}
