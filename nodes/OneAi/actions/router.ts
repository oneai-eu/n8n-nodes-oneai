import type { IExecuteFunctions, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import * as artifact from './artifact';
import * as auth from './misc';
import * as auditLog from './auditLog';
import * as chat from './chat';
import * as ai from './ai';
import * as compliancePattern from './compliancePattern';
import * as dataset from './dataset';
import * as datasetRow from './datasetRow';
import * as project from './project';
import * as reference from './reference';
import * as space from './space';
import { isOperationAllowed } from '../modes';

/** n8n's own sentinel for the "Custom API Call" option it injects into resource/operation lists. */
const CUSTOM_API_CALL = '__CUSTOM_API_CALL__';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter('resource', 0) as string;
	// A fallback rather than a throw: when the author picks "Custom API Call", n8n displays no
	// `operation` property at all, and reading it without one fails with its own internal
	// `Could not get parameter "operation"` - which tells the author nothing.
	const operation = this.getNodeParameter('operation', 0, '') as string;

	// n8n adds "Custom API Call" to `resource` and `operation` by itself, for any node that has
	// static options and a credential. We do not implement it, so say so in terms the author can
	// act on instead of letting them meet an internal error.
	if (resource === CUSTOM_API_CALL || operation === CUSTOM_API_CALL) {
		throw new NodeOperationError(
			this.getNode(),
			'This node does not support "Custom API Call". Choose a resource and an operation, or use n8n\'s HTTP Request node with your oneAI credential to call an endpoint this node does not expose.',
		);
	}

	let gatewayOnly = false;
	try {
		const credentials = await this.getCredentials('oneAiApi');
		gatewayOnly = credentials.gatewayOnly === true;
	} catch {
		// If credentials can't be loaded, the request will fail downstream anyway
	}

	if (!isOperationAllowed(resource, operation, gatewayOnly)) {
		throw new NodeOperationError(
			this.getNode(),
			gatewayOnly
				? `Operation "${operation}" on resource "${resource}" is not available in Gateway Only mode. Disable "Gateway Only" on the credential to use hub features.`
				: `Unknown resource/operation: ${resource}/${operation}`,
		);
	}

	// `datasetRow:appendMany` is the one operation that runs ONCE for the whole input rather than
	// once per item: it builds a single CSV from every item and sends one `import-csv` request, so
	// it cannot sit inside the loop below. The arm is written out explicitly rather than
	// duck-typed on `'executeAll' in module`, because router.ts is the authority on the shipped
	// surface and both structural checkers parse it - an operation dispatched by a shape they
	// cannot read would be invisible to them while they printed a clean table.
	if (resource === 'datasetRow' && operation === 'appendMany') {
		try {
			return [await datasetRow.appendMany.executeAll.call(this, items)];
		} catch (error) {
			if (this.continueOnFail()) {
				// The import is one atomic transaction, so the failure belongs to every input item.
				return [
					[
						{
							json: { error: (error as Error).message },
							pairedItem: items.map((_, inputItem) => ({ item: inputItem })),
						},
					],
				];
			}
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	for (let i = 0; i < items.length; i++) {
		try {
			let responseData: INodeExecutionData[] = [];

			switch (resource) {
				case 'miscellaneous':
					switch (operation) {
						case 'checkAuth':
							responseData = await auth.checkAuth.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'artifact':
					switch (operation) {
						case 'create':
							responseData = await artifact.create.execute.call(this, i);
							break;
						case 'delete':
							responseData = await artifact.delete.execute.call(this, i);
							break;
						case 'exportPdf':
							responseData = await artifact.exportPdf.execute.call(this, i);
							break;
						case 'exportPptx':
							responseData = await artifact.exportPptx.execute.call(this, i);
							break;
						case 'getMarkdown':
							responseData = await artifact.getMarkdown.execute.call(this, i);
							break;
						case 'listAll':
							responseData = await artifact.listAll.execute.call(this, i);
							break;
						case 'listBySpace':
							responseData = await artifact.listBySpace.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'auditLog':
					switch (operation) {
						case 'get':
							responseData = await auditLog.get.execute.call(this, i);
							break;
						case 'list':
							responseData = await auditLog.list.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'chat':
					switch (operation) {
						case 'create':
							responseData = await chat.create.execute.call(this, i);
							break;
						case 'delete':
							responseData = await chat.delete.execute.call(this, i);
							break;
						case 'get':
							responseData = await chat.get.execute.call(this, i);
							break;
						case 'list':
							responseData = await chat.list.execute.call(this, i);
							break;
						case 'update':
							responseData = await chat.update.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'compliancePattern':
					switch (operation) {
						case 'create':
							responseData = await compliancePattern.create.execute.call(this, i);
							break;
						case 'delete':
							responseData = await compliancePattern.deletePattern.execute.call(this, i);
							break;
						case 'edit':
							responseData = await compliancePattern.edit.execute.call(this, i);
							break;
						case 'list':
							responseData = await compliancePattern.list.execute.call(this, i);
							break;
						case 'setEnabled':
							responseData = await compliancePattern.setEnabled.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'dataset':
					switch (operation) {
						case 'create':
							responseData = await dataset.create.execute.call(this, i);
							break;
						case 'exportCsv':
							responseData = await dataset.exportCsv.execute.call(this, i);
							break;
						case 'importCsv':
							responseData = await dataset.importCsv.execute.call(this, i);
							break;
						case 'list':
							responseData = await dataset.list.execute.call(this, i);
							break;
						case 'listSpaces':
							responseData = await dataset.listSpaces.execute.call(this, i);
							break;
						case 'updateSchema':
							responseData = await dataset.updateSchema.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'datasetRow':
					switch (operation) {
						case 'append':
							responseData = await datasetRow.append.execute.call(this, i);
							break;
						case 'delete':
							responseData = await datasetRow.delete.execute.call(this, i);
							break;
						case 'list':
							responseData = await datasetRow.list.execute.call(this, i);
							break;
						case 'update':
							responseData = await datasetRow.update.execute.call(this, i);
							break;
						// `appendMany` is handled before this loop - it runs once for all items.
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'ai':
					switch (operation) {
						case 'createEmbedding':
							responseData = await ai.createEmbedding.execute.call(this, i);
							break;
						case 'createResponse':
							responseData = await ai.createResponse.execute.call(this, i);
							break;
						case 'editImage':
							responseData = await ai.editImage.execute.call(this, i);
							break;
						case 'generateImage':
							responseData = await ai.generateImage.execute.call(this, i);
							break;
						case 'generateSpeech':
							responseData = await ai.generateSpeech.execute.call(this, i);
							break;
						case 'listModels':
							responseData = await ai.listModels.execute.call(this, i);
							break;
						case 'listImageModels':
							responseData = await ai.listImageModels.execute.call(this, i);
							break;
						case 'transcribeAudio':
							responseData = await ai.transcribeAudio.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'project':
					switch (operation) {
						case 'archive':
							responseData = await project.archive.execute.call(this, i);
							break;
						case 'get':
							responseData = await project.get.execute.call(this, i);
							break;
						case 'instantiateTemplate':
							responseData = await project.instantiateTemplate.execute.call(this, i);
							break;
						case 'list':
							responseData = await project.list.execute.call(this, i);
							break;
						case 'unarchive':
							responseData = await project.unarchive.execute.call(this, i);
							break;
						case 'update':
							responseData = await project.update.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'reference':
					switch (operation) {
						case 'listFiles':
							responseData = await reference.listFiles.execute.call(this, i);
							break;
						case 'listSpaces':
							responseData = await reference.listSpaces.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				case 'space':
					switch (operation) {
						case 'addTeam':
							responseData = await space.addTeam.execute.call(this, i);
							break;
						case 'addUser':
							responseData = await space.addUser.execute.call(this, i);
							break;
						case 'create':
							responseData = await space.create.execute.call(this, i);
							break;
						case 'delete':
							responseData = await space.delete.execute.call(this, i);
							break;
						case 'deleteFile':
							responseData = await space.deleteFile.execute.call(this, i);
							break;
						case 'downloadFile':
							responseData = await space.downloadFile.execute.call(this, i);
							break;
						case 'embedFiles':
							responseData = await space.embedFiles.execute.call(this, i);
							break;
						case 'get':
							responseData = await space.get.execute.call(this, i);
							break;
						case 'getExtractedText':
							responseData = await space.getExtractedText.execute.call(this, i);
							break;
						case 'getFileStats':
							responseData = await space.getFileStats.execute.call(this, i);
							break;
						case 'list':
							responseData = await space.list.execute.call(this, i);
							break;
						case 'listFiles':
							responseData = await space.listFiles.execute.call(this, i);
							break;
						case 'listFolder':
							responseData = await space.listFolder.execute.call(this, i);
							break;
						case 'listTeams':
							responseData = await space.listTeams.execute.call(this, i);
							break;
						case 'listUsers':
							responseData = await space.listUsers.execute.call(this, i);
							break;
						case 'removeTeam':
							responseData = await space.removeTeam.execute.call(this, i);
							break;
						case 'removeUser':
							responseData = await space.removeUser.execute.call(this, i);
							break;
						case 'renameFile':
							responseData = await space.renameFile.execute.call(this, i);
							break;
						case 'sync':
							responseData = await space.sync.execute.call(this, i);
							break;
						case 'transferFile':
							responseData = await space.transferFile.execute.call(this, i);
							break;
						case 'uploadFile':
							responseData = await space.uploadFile.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				default:
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
						itemIndex: i,
					});
			}

			returnData.push(...responseData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
				continue;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	return [returnData];
}
