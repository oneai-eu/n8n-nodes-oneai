/**
 * Version 1 of the oneAI node — the implementation every workflow saved so far refers to.
 *
 * 🔴 `typeVersion: 1` is stamped into every node anyone has ever placed, and
 * `VersionedNodeType.getNodeType(version)` is a bare map lookup with no fallback. This class must
 * therefore remain reachable as key `1` for the life of the package. A future version 2 is added
 * BESIDE it; it never replaces it.
 *
 * Nothing about this file's behaviour changed when it was split out of `OneAi.node.ts` — the split
 * only moved the implementation so that a second version can exist later without touching this one.
 */
import type {
	IExecuteFunctions,
	INodeTypeBaseDescription,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as artifact from '../actions/artifact';
import * as auditLog from '../actions/auditLog';
import * as chat from '../actions/chat';
import * as ai from '../actions/ai';
import * as compliancePattern from '../actions/compliancePattern';
import * as dataset from '../actions/dataset';
import * as datasetRow from '../actions/datasetRow';
import * as checkAuth from '../actions/misc';
import * as project from '../actions/project';
import * as reference from '../actions/reference';
import { router } from '../actions/router';
import * as space from '../actions/space';
import { operationProperties, resourceProperty } from '../modes';

export class OneAiV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		// Identity - display name, icon, group, subtitle - comes from the wrapper, so that the
		// `file:` icon paths resolve next to `OneAi.node.ts` where the SVGs actually live, and so
		// that every version keeps one identity in the nodes panel.
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'oneAI',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'oneAiApi',
					required: true,
				},
			],
			properties: [
				resourceProperty,
				...operationProperties,
				...artifact.description,
				...checkAuth.description,
				...auditLog.description,
				...chat.description,
				...ai.description,
				...compliancePattern.description,
				...dataset.description,
				...datasetRow.description,
				...project.description,
				...reference.description,
				...space.description,
			],
			usableAsTool: true,
		};
	}

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

	// continueOnFail() is handled per item inside router() (see actions/router.ts),
	// which owns the item loop and try/catch for every resource/operation.
	// eslint-disable-next-line @n8n/community-nodes/require-continue-on-fail
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return router.call(this);
	}
}
