import type { INodePropertyOptions } from 'n8n-workflow';

export interface ResourceDefinition {
	name: string;
	value: string;
	description: string;
	gateway: boolean;
}

export interface OperationDefinition {
	name: string;
	value: string;
	description: string;
	action: string;
	gateway: boolean;
}

export const RESOURCES: ResourceDefinition[] = [
	{ name: 'AI', value: 'ai', description: 'Inference: chat, images, speech, embeddings, transcription', gateway: true },
	{ name: 'Artifact', value: 'artifact', description: 'Hub artifacts (markdown, PDFs, distilled documents)', gateway: false },
	{ name: 'Chat', value: 'chat', description: 'Hub chat management', gateway: false },
	{ name: 'Compliance Pattern', value: 'compliancePattern', description: 'Hub compliance patterns (EU AI Act content policies)', gateway: false },
	{ name: 'Miscellaneous', value: 'miscellaneous', description: 'Authentication checks and helpers', gateway: true },
	{ name: 'Project', value: 'project', description: 'Hub projects', gateway: false },
	{ name: 'Reference', value: 'reference', description: 'Browse hub spaces and files as chat references', gateway: false },
	{ name: 'Space', value: 'space', description: 'Hub spaces and files', gateway: false },
];

export const OPERATIONS: Record<string, OperationDefinition[]> = {
	ai: [
		{
			name: 'Create Embedding',
			value: 'createEmbedding',
			description: 'Generate vector embeddings for text',
			action: 'Create an embedding',
			gateway: true,
		},
		{
			name: 'Create Response',
			value: 'createResponse',
			description: 'Send a message to an AI model and get a response',
			action: 'Create a response',
			gateway: true,
		},
		{
			name: 'Edit Image',
			value: 'editImage',
			description: 'Edit an existing image from a text prompt',
			action: 'Edit an image',
			gateway: true,
		},
		{
			name: 'Generate Image',
			value: 'generateImage',
			description: 'Generate an image from a text prompt',
			action: 'Generate an image',
			gateway: true,
		},
		{
			name: 'Generate Speech',
			value: 'generateSpeech',
			description: 'Synthesize speech audio from text',
			action: 'Generate speech',
			gateway: true,
		},
		{
			name: 'List Available AI Models',
			value: 'listModels',
			description: 'List all available AI models',
			action: 'List available AI models',
			gateway: true,
		},
		{
			name: 'List Available Image Models',
			value: 'listImageModels',
			description: 'List all available image generation models',
			action: 'List available image models',
			gateway: true,
		},
		{
			name: 'Transcribe Audio',
			value: 'transcribeAudio',
			description: 'Transcribe an audio file to text',
			action: 'Transcribe audio',
			gateway: true,
		},
	],
	artifact: [
		{ name: 'Create', value: 'create', description: 'Create an artifact from a file', action: 'Create an artifact', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete an artifact from a space', action: 'Delete an artifact', gateway: false },
		{ name: 'Export PDF', value: 'exportPdf', description: 'Export an artifact as a PDF', action: 'Export artifact as PDF', gateway: false },
		{ name: 'Get Markdown', value: 'getMarkdown', description: 'Get the markdown content of an artifact', action: 'Get artifact markdown', gateway: false },
		{ name: 'List All', value: 'listAll', description: 'List all artifacts with optional filtering', action: 'List all artifacts', gateway: false },
		{ name: 'List by Space', value: 'listBySpace', description: 'List artifacts in a specific space', action: 'List artifacts in space', gateway: false },
	],
	chat: [
		{ name: 'Create', value: 'create', description: 'Create a new chat', action: 'Create a chat', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete a chat', action: 'Delete a chat', gateway: false },
		{ name: 'Get', value: 'get', description: 'Get chat history', action: 'Get a chat', gateway: false },
		{ name: 'List', value: 'list', description: 'List chats with optional filtering', action: 'List all chats', gateway: false },
		{ name: 'Update', value: 'update', description: 'Update chat details (rename or move)', action: 'Update a chat', gateway: false },
	],
	compliancePattern: [
		{ name: 'Create', value: 'create', description: 'Create a custom compliance pattern', action: 'Create a compliance pattern', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete a custom compliance pattern', action: 'Delete a compliance pattern', gateway: false },
		{ name: 'Edit', value: 'edit', description: 'Edit a custom compliance pattern', action: 'Edit a compliance pattern', gateway: false },
		{ name: 'List', value: 'list', description: 'List default and custom compliance patterns', action: 'List compliance patterns', gateway: false },
		{ name: 'Set Enabled', value: 'setEnabled', description: 'Enable or disable a compliance pattern', action: 'Enable or disable a compliance pattern', gateway: false },
	],
	miscellaneous: [
		{ name: 'Check Authentication', value: 'checkAuth', description: 'Check the authenticated user and return their details', action: 'Check authenticated user', gateway: true },
	],
	project: [
		{ name: 'Create', value: 'create', description: 'Create a new project', action: 'Create a project', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete a project', action: 'Delete a project', gateway: false },
		{ name: 'Get', value: 'get', description: 'Get a project by ID', action: 'Get a project', gateway: false },
		{ name: 'List', value: 'list', description: 'List all projects', action: 'List all projects', gateway: false },
		{ name: 'Update', value: 'update', description: 'Update a project', action: 'Update a project', gateway: false },
	],
	reference: [
		{ name: 'List Files', value: 'listFiles', description: 'List files accessible for attaching as references', action: 'List reference files', gateway: false },
		{ name: 'List Spaces', value: 'listSpaces', description: 'List spaces accessible for attaching as references', action: 'List reference spaces', gateway: false },
	],
	space: [
		{ name: 'Add Team', value: 'addTeam', description: 'Add a team to a space', action: 'Add team to space', gateway: false },
		{ name: 'Add User', value: 'addUser', description: 'Add a user to a space', action: 'Add user to space', gateway: false },
		{ name: 'Create', value: 'create', description: 'Create a new space', action: 'Create a space', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete a space', action: 'Delete a space', gateway: false },
		{ name: 'Delete File', value: 'deleteFile', description: 'Delete a file from a space', action: 'Delete file from space', gateway: false },
		{ name: 'Download File', value: 'downloadFile', description: 'Download a file from a space', action: 'Download file from space', gateway: false },
		{ name: 'Embed Files', value: 'embedFiles', description: 'Queue files/folders for embedding', action: 'Embed files in space', gateway: false },
		{ name: 'Get', value: 'get', description: 'Get a space by ID', action: 'Get a space', gateway: false },
		{ name: 'List', value: 'list', description: 'List all spaces', action: 'List all spaces', gateway: false },
		{ name: 'List Files', value: 'listFiles', description: 'List files in a space', action: 'List files in space', gateway: false },
		{ name: 'List Teams', value: 'listTeams', description: 'List teams assigned to a space', action: 'List teams in space', gateway: false },
		{ name: 'List Users', value: 'listUsers', description: 'List users assigned to a space', action: 'List users in space', gateway: false },
		{ name: 'Remove Team', value: 'removeTeam', description: 'Remove a team from a space', action: 'Remove team from space', gateway: false },
		{ name: 'Remove User', value: 'removeUser', description: 'Remove a user from a space', action: 'Remove user from space', gateway: false },
		{ name: 'Sync', value: 'sync', description: 'Synchronize a linked space', action: 'Sync a space', gateway: false },
		{ name: 'Transfer File', value: 'transferFile', description: 'Move or copy a file between spaces', action: 'Transfer file between spaces', gateway: false },
		{ name: 'Upload File', value: 'uploadFile', description: 'Upload a file to a space', action: 'Upload file to space', gateway: false },
	],
};

export const DEFAULT_RESOURCE = 'ai';
export const DEFAULT_OPERATION_PER_RESOURCE: Record<string, string> = {
	ai: 'createResponse',
	artifact: 'listAll',
	chat: 'list',
	compliancePattern: 'list',
	miscellaneous: 'checkAuth',
	project: 'list',
	reference: 'listSpaces',
	space: 'list',
};

export const filterResources = (gatewayOnly: boolean): INodePropertyOptions[] =>
	RESOURCES.filter((r) => !gatewayOnly || r.gateway).map((r) => ({
		name: r.name,
		value: r.value,
		description: r.description,
	}));

export const filterOperations = (
	resource: string,
	gatewayOnly: boolean,
): INodePropertyOptions[] => {
	const ops = OPERATIONS[resource] ?? [];
	return ops
		.filter((o) => !gatewayOnly || o.gateway)
		.map((o) => ({
			name: o.name,
			value: o.value,
			description: o.description,
			action: o.action,
		}));
};

export const isOperationAllowed = (
	resource: string,
	operation: string,
	gatewayOnly: boolean,
): boolean => {
	if (gatewayOnly) {
		const resourceDef = RESOURCES.find((r) => r.value === resource);
		if (!resourceDef?.gateway) return false;
	}
	const ops = OPERATIONS[resource] ?? [];
	const opDef = ops.find((o) => o.value === operation);
	if (!opDef) return false;
	if (gatewayOnly && !opDef.gateway) return false;
	return true;
};
