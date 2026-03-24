import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

// import * as apiKey from './actions/apiKey';
import * as artifact from './actions/artifact';
// import * as auditLog from './actions/auditLog';
import * as chat from './actions/chat';
// import * as complianceLlm from './actions/complianceLlm';
// import * as member from './actions/member';
import * as ai from './actions/ai';
import * as checkAuth from './actions/misc';
// import * as organization from './actions/organization';
import * as project from './actions/project';
import * as reference from './actions/reference';
import { router } from './actions/router';
import * as space from './actions/space';
// import * as stats from './actions/stats';
// import * as team from './actions/team';

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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'AI',
						value: 'ai',
					},
					// {
					// 	name: 'API Key',
					// 	value: 'apiKey',
					// },
					{
						name: 'Artifact',
						value: 'artifact',
					},
					// {
					// 	name: 'Audit Log',
					// 	value: 'auditLog',
					// },
					{
						name: 'Chat',
						value: 'chat',
					},
					{
						name: 'Miscellaneous',
						value: 'miscellaneous'
					},
					// {
					// 	name: 'Compliance LLM',
					// 	value: 'complianceLlm',
					// },
					// {
					// 	name: 'Member',
					// 	value: 'member',
					// },
					// {
					// 	name: 'Organization',
					// 	value: 'organization',
					// },
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Reference',
						value: 'reference',
					},
					{
						name: 'Space',
						value: 'space',
					},
					// {
					// 	name: 'Stats',
					// 	value: 'stats',
					// },
					// {
					// 	name: 'Team',
					// 	value: 'team',
					// },
				],
				default: 'project',
			},
			// ...apiKey.description,
			...artifact.description,
			...checkAuth.description,
			// ...auditLog.description,
			...chat.description,
			// ...complianceLlm.description,
			// ...member.description,
			...ai.description,
			// ...organization.description,
			...project.description,
			...reference.description,
			...space.description,
			// ...stats.description,
			// ...team.description,
		],
		usableAsTool: true,
	};

	methods = {
		loadOptions: {
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
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return router.call(this);
	}
}
