import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Audit Log ID',
		name: 'auditLogId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the audit log to retrieve',
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['get'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const auditLogId = this.getNodeParameter('auditLogId', index) as string;

	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: `/api/audit/logs/${auditLogId}`,
	});

	return this.helpers.returnJsonArray(response);
}
