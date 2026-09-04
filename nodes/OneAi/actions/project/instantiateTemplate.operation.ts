import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequest } from '../../transport';

/**
 * `POST /api/projects/templates/{templateId}/instantiate`, body `{ name?: string }`
 * (`additionalProperties: false`, no required field), responding `{ projectId }`.
 *
 * This is how a project is created now that `POST /api/projects` no longer exists: from a
 * template, which carries the project's spaces, prompt and settings with it. There is no plain
 * "create an empty project" endpoint to expose, so this is not a rename of the operation that was
 * removed - it takes a template ID, not a name and a description.
 *
 * `Name` is optional in the schema and defaults to the template's own name, so an empty value is
 * omitted from the body rather than sent as an empty string.
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the project template to instantiate',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['instantiateTemplate'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: "Name for the new project. Leave empty to use the template's own name.",
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['instantiateTemplate'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const templateId = this.getNodeParameter('templateId', index) as string;
	const name = this.getNodeParameter('name', index) as string;

	const body: { name?: string } = {};

	if (name !== '') {
		body.name = name;
	}

	const response = await oneAiApiRequest.call(this, {
		method: 'POST',
		endpoint: `/api/projects/templates/${encodeURIComponent(templateId)}/instantiate`,
		body,
	});

	return this.helpers.returnJsonArray(response).map((item) => ({
		...item,
		pairedItem: { item: index },
	}));
}
