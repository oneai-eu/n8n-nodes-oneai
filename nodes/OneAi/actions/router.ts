import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// import * as apiKey from './apiKey';
import * as artifact from './artifact';
// import * as auditLog from './auditLog';
import * as chat from './chat';
// import * as complianceLlm from './complianceLlm';
// import * as compliancePattern from './compliancePattern';
// import * as member from './member';
import * as openai from './openai';
// import * as organization from './organization';
import * as project from './project';
import * as reference from './reference';
import * as space from './space';
// import * as stats from './stats';
// import * as team from './team';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	for (let i = 0; i < items.length; i++) {
		try {
			let responseData: INodeExecutionData[] = [];

			switch (resource) {
				// case 'apiKey':
				// 	switch (operation) {
				// 		case 'create':
				// 			responseData = await apiKey.create.execute.call(this, i);
				// 			break;
				// 		case 'delete':
				// 			responseData = await apiKey.delete.execute.call(this, i);
				// 			break;
				// 		case 'get':
				// 			responseData = await apiKey.get.execute.call(this, i);
				// 			break;
				// 		case 'getStatistics':
				// 			responseData = await apiKey.getStatistics.execute.call(this);
				// 			break;
				// 		case 'list':
				// 			responseData = await apiKey.list.execute.call(this, i);
				// 			break;
				// 		default:
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				`Unknown operation: ${operation}`,
				// 				{ itemIndex: i },
				// 			);
				// 	}
				// 	break;

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

				// case 'auditLog':
				// 	switch (operation) {
				// 		case 'get':
				// 			responseData = await auditLog.get.execute.call(this, i);
				// 			break;
				// 		case 'list':
				// 			responseData = await auditLog.list.execute.call(this, i);
				// 			break;
				// 		default:
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				`Unknown operation: ${operation}`,
				// 				{ itemIndex: i },
				// 			);
				// 	}
				// 	break;

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
						case 'getModels':
							responseData = await chat.getModels.execute.call(this);
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

				// case 'complianceLlm':
				// 	switch (operation) {
				// 		case 'getStatus':
				// 			responseData = await complianceLlm.getStatus.execute.call(this);
				// 			break;
				// 		case 'updateSettings':
				// 			responseData = await complianceLlm.updateSettings.execute.call(this, i);
				// 			break;
				// 		default:
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				`Unknown operation: ${operation}`,
				// 				{ itemIndex: i },
				// 			);
				// 	}
				// 	break;

				// case 'compliancePattern':
				// 	switch (operation) {
				// 		case 'create':
				// 			responseData = await compliancePattern.create.execute.call(this, i);
				// 			break;
				// 		case 'delete':
				// 			responseData = await compliancePattern.delete.execute.call(this, i);
				// 			break;
				// 		case 'edit':
				// 			responseData = await compliancePattern.edit.execute.call(this, i);
				// 			break;
				// 		case 'list':
				// 			responseData = await compliancePattern.list.execute.call(this, i);
				// 			break;
				// 		case 'toggleEnabled':
				// 			responseData = await compliancePattern.toggleEnabled.execute.call(this, i);
				// 			break;
				// 		default:
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				`Unknown operation: ${operation}`,
				// 				{ itemIndex: i },
				// 			);
				// 	}
				// 	break;

				case 'openai':
					switch (operation) {
						case 'createResponse':
							responseData = await openai.createResponse.execute.call(this, i);
							break;
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				// case 'member':
				// 	switch (operation) {
				// 		case 'create':
				// 			responseData = await member.create.execute.call(this, i);
				// 			break;
				// 		case 'delete':
				// 			responseData = await member.delete.execute.call(this, i);
				// 			break;
				// 		case 'getStatistics':
				// 			responseData = await member.getStatistics.execute.call(this);
				// 			break;
				// 		case 'list':
				// 			responseData = await member.list.execute.call(this, i);
				// 			break;
				// 		case 'resetRecovery':
				// 			responseData = await member.resetRecovery.execute.call(this, i);
				// 			break;
				// 		case 'update':
				// 			responseData = await member.update.execute.call(this, i);
				// 			break;
				// 		default:
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				`Unknown operation: ${operation}`,
				// 				{ itemIndex: i },
				// 			);
				// 	}
				// 	break;

				// case 'organization':
				// 	switch (operation) {
				// 		case 'getCurrent':
				// 			responseData = await organization.getCurrent.execute.call(this);
				// 			break;
				// 		case 'getStatistics':
				// 			responseData = await organization.getStatistics.execute.call(this);
				// 			break;
				// 		case 'update':
				// 			responseData = await organization.update.execute.call(this, i);
				// 			break;
				// 		case 'updateCompliance':
				// 			responseData = await organization.updateCompliance.execute.call(this, i);
				// 			break;
				// 		default:
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				`Unknown operation: ${operation}`,
				// 				{ itemIndex: i },
				// 			);
				// 	}
				// 	break;

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
						// case 'getStatistics':
						// 	responseData = await project.getStatistics.execute.call(this);
						// 	break;
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
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown operation: ${operation}`,
								{ itemIndex: i },
							);
					}
					break;

				// case 'stats':
				// 	switch (operation) {
				// 		case 'dashboard':
				// 			responseData = await stats.dashboard.execute.call(this, i);
				// 			break;
				// 		case 'usage':
				// 			responseData = await stats.usage.execute.call(this, i);
				// 			break;
				// 		default:
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				`Unknown operation: ${operation}`,
				// 				{ itemIndex: i },
				// 			);
				// 	}
				// 	break;

				// case 'team':
				// 	switch (operation) {
				// 		case 'addMember':
				// 			responseData = await team.addMember.execute.call(this, i);
				// 			break;
				// 		case 'create':
				// 			responseData = await team.create.execute.call(this, i);
				// 			break;
				// 		case 'delete':
				// 			responseData = await team.delete.execute.call(this, i);
				// 			break;
				// 		case 'get':
				// 			responseData = await team.get.execute.call(this, i);
				// 			break;
				// 		case 'list':
				// 			responseData = await team.list.execute.call(this, i);
				// 			break;
				// 		case 'listMembers':
				// 			responseData = await team.listMembers.execute.call(this, i);
				// 			break;
				// 		case 'removeMember':
				// 			responseData = await team.removeMember.execute.call(this, i);
				// 			break;
				// 		default:
				// 			throw new NodeOperationError(
				// 				this.getNode(),
				// 				`Unknown operation: ${operation}`,
				// 				{ itemIndex: i },
				// 			);
				// 	}
				// 	break;

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
