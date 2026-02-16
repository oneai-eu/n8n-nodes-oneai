import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

// import * as apiKey from './actions/apiKey';
import * as artifact from './actions/artifact';
// import * as auditLog from './actions/auditLog';
import * as chat from './actions/chat';
// import * as complianceLlm from './actions/complianceLlm';
// import * as compliancePattern from './actions/compliancePattern';
// import * as member from './actions/member';
import * as openai from './actions/openai';
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
					// {
					// 	name: 'Compliance LLM',
					// 	value: 'complianceLlm',
					// },
					// {
					// 	name: 'Compliance Pattern',
					// 	value: 'compliancePattern',
					// },
					// {
					// 	name: 'Member',
					// 	value: 'member',
					// },
					{
						name: 'OpenAI',
						value: 'openai',
					},
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
			// ...auditLog.description,
			...chat.description,
			// ...complianceLlm.description,
			// ...compliancePattern.description,
			// ...member.description,
			...openai.description,
			// ...organization.description,
			...project.description,
			...reference.description,
			...space.description,
			// ...stats.description,
			// ...team.description,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return router.call(this);
	}
}
