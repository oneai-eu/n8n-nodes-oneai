import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

export const description: INodeProperties[] = [];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const response = await oneAiApiRequest.call(this, {
		method: 'GET',
		endpoint: '/api/projects/stats',
	});

	return this.helpers.returnJsonArray(response);
}
