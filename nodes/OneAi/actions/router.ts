import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as artifact from './artifact';
import * as auth from './misc';
import * as chat from './chat';
import * as ai from './ai';
import * as compliancePattern from './compliancePattern';
import * as project from './project';
import * as reference from './reference';
import * as space from './space';
import { isOperationAllowed } from '../modes';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

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
							responseData = await ai.listModels.execute.call(this);
							break;
						case 'listImageModels':
							responseData = await ai.listImageModels.execute.call(this);
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
						case 'create':
							responseData = await project.create.execute.call(this, i);
							break;
						case 'delete':
							responseData = await project.delete.execute.call(this, i);
							break;
						case 'get':
							responseData = await project.get.execute.call(this, i);
							break;
						case 'list':
							responseData = await project.list.execute.call(this, i);
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
						case 'list':
							responseData = await space.list.execute.call(this, i);
							break;
						case 'listFiles':
							responseData = await space.listFiles.execute.call(this, i);
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
			throw error;
		}
	}

	return [returnData];
}
