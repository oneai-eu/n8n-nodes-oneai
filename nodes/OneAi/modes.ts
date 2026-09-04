import type { INodeProperties } from 'n8n-workflow';

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
	{ name: 'Audit Log', value: 'auditLog', description: 'Hub audit logs (EU AI Act compliance records)', gateway: false },
	{ name: 'Chat', value: 'chat', description: 'Hub chat management', gateway: false },
	{ name: 'Compliance Pattern', value: 'compliancePattern', description: 'Hub compliance patterns (EU AI Act content policies)', gateway: false },
	{ name: 'Dataset', value: 'dataset', description: 'Tables in a oneData space: schema, CSV import and export', gateway: false },
	{ name: 'Dataset Row', value: 'datasetRow', description: 'Rows in a oneData table: append, read, update, delete', gateway: false },
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
		{ name: 'Create', value: 'create', description: 'Create an artifact in a space, optionally from a chat message', action: 'Create an artifact', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete an artifact from a space', action: 'Delete an artifact', gateway: false },
		{ name: 'Export PDF', value: 'exportPdf', description: 'Export an artifact as a PDF', action: 'Export artifact as PDF', gateway: false },
		{ name: 'Export PPTX', value: 'exportPptx', description: 'Export a presentation artifact as a PPTX file', action: 'Export artifact as PPTX', gateway: false },
		{ name: 'Get Markdown', value: 'getMarkdown', description: 'Get the markdown content of an artifact', action: 'Get artifact markdown', gateway: false },
		{ name: 'List All', value: 'listAll', description: 'List all artifacts with optional filtering', action: 'List all artifacts', gateway: false },
		{ name: 'List by Space', value: 'listBySpace', description: 'List artifacts in a specific space', action: 'List artifacts in space', gateway: false },
	],
	auditLog: [
		{ name: 'Get', value: 'get', description: 'Get an audit log by ID', action: 'Get an audit log', gateway: false },
		{ name: 'List', value: 'list', description: 'List audit logs with optional filtering', action: 'List audit logs', gateway: false },
	],
	chat: [
		{ name: 'Create', value: 'create', description: 'Create a new chat', action: 'Create a chat', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete a chat', action: 'Delete a chat', gateway: false },
		{ name: 'Export', value: 'export', description: 'Export a chat as a Markdown document', action: 'Export a chat as Markdown', gateway: false },
		{ name: 'Get', value: 'get', description: 'Get chat history', action: 'Get a chat', gateway: false },
		{ name: 'Get Blob', value: 'getBlob', description: 'Download an image or file that a chat produced, as binary data. Get returns the blob IDs, on the parts of its assistant messages.', action: 'Get a chat blob', gateway: false },
		{ name: 'Get Blob URL', value: 'getBlobUrl', description: 'Generate a pre-authenticated URL for a chat blob. The link is signed and time-limited, needs no oneAI credential, and is stored in the execution data.', action: 'Get a chat blob URL', gateway: false },
		{ name: 'List', value: 'list', description: 'List chats with optional filtering', action: 'List all chats', gateway: false },
		{ name: 'Rate Message', value: 'rateMessage', description: 'Rate an assistant message thumbs up or down. Removing a rating is not part of this node, although the API supports it.', action: 'Rate a chat message', gateway: false },
		{ name: 'Save Blob to Space', value: 'saveBlobToSpace', description: 'Save a chat blob into a space as a file, without moving the bytes through n8n', action: 'Save a chat blob to a space', gateway: false },
		{ name: 'Update', value: 'update', description: 'Update chat details (rename, switch branch, or set persona/agent)', action: 'Update a chat', gateway: false },
	],
	compliancePattern: [
		{ name: 'Create', value: 'create', description: 'Create a custom compliance pattern', action: 'Create a compliance pattern', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete a custom compliance pattern', action: 'Delete a compliance pattern', gateway: false },
		{ name: 'Edit', value: 'edit', description: 'Edit a custom compliance pattern', action: 'Edit a compliance pattern', gateway: false },
		{ name: 'List', value: 'list', description: 'List default and custom compliance patterns', action: 'List compliance patterns', gateway: false },
		{ name: 'Set Enabled', value: 'setEnabled', description: 'Enable or disable a compliance pattern', action: 'Enable or disable a compliance pattern', gateway: false },
	],
	dataset: [
		{ name: 'Create', value: 'create', description: 'Create an empty dataset with a typed schema', action: 'Create a dataset', gateway: false },
		{ name: 'Export CSV', value: 'exportCsv', description: 'Export a whole dataset as a CSV file', action: 'Export a dataset as CSV', gateway: false },
		{ name: 'Import CSV', value: 'importCsv', description: 'Bulk-append the rows of a CSV file to a dataset', action: 'Import a CSV into a dataset', gateway: false },
		{ name: 'List', value: 'list', description: 'List the datasets in a space with their columns and row counts', action: 'List datasets in space', gateway: false },
		{ name: 'List Spaces', value: 'listSpaces', description: 'List the spaces that hold datasets, to get a space ID for the other dataset operations', action: 'List dataset spaces', gateway: false },
		{ name: 'Update Schema', value: 'updateSchema', description: "Add, drop or rename a dataset's columns", action: 'Update a dataset schema', gateway: false },
	],
	datasetRow: [
		{ name: 'Append', value: 'append', description: 'Append one row per input item and return each new row ID', action: 'Append a dataset row', gateway: false },
		{ name: 'Append Many', value: 'appendMany', description: 'Append every input item in a single CSV request, without row IDs', action: 'Append many dataset rows', gateway: false },
		{ name: 'Delete', value: 'delete', description: 'Delete rows from a dataset by their IDs', action: 'Delete dataset rows', gateway: false },
		{ name: 'List', value: 'list', description: "List a dataset's rows, each with its row ID", action: 'List dataset rows', gateway: false },
		{ name: 'Update', value: 'update', description: 'Update named columns of one row by its ID', action: 'Update a dataset row', gateway: false },
	],
	miscellaneous: [
		{ name: 'Check Authentication', value: 'checkAuth', description: 'Check the authenticated user and return their details', action: 'Check authenticated user', gateway: true },
	],
	// `Create` and `Delete` were removed: oneAI no longer serves `POST /api/projects` or
	// `DELETE /api/projects/{projectId}`. The capability is back under the names of the endpoints
	// that do exist - `Instantiate Template` creates a project from a template, `Archive` retires
	// one - and deliberately not under the old names, because neither is a drop-in replacement:
	// instantiating takes a template ID rather than a name, and archiving is reversible.
	project: [
		{ name: 'Archive', value: 'archive', description: 'Archive a project', action: 'Archive a project', gateway: false },
		{ name: 'Get', value: 'get', description: 'Get a project by ID', action: 'Get a project', gateway: false },
		{ name: 'Instantiate Template', value: 'instantiateTemplate', description: 'Create a new project from a project template', action: 'Create a project from a template', gateway: false },
		{ name: 'List', value: 'list', description: 'List all projects', action: 'List all projects', gateway: false },
		{ name: 'Unarchive', value: 'unarchive', description: 'Restore a project from the archive', action: 'Unarchive a project', gateway: false },
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
		{ name: 'Get Extracted Text', value: 'getExtractedText', description: 'Get the extracted Markdown text of a file in a space, without downloading its bytes', action: 'Get extracted text of a file in space', gateway: false },
		{ name: 'Get File Stats', value: 'getFileStats', description: 'Get embedding progress counts for every file in a space. Embedding is asynchronous, so this is how a workflow learns that Upload File and Embed Files have finished: poll until pending reaches zero.', action: 'Get file stats in space', gateway: false },
		{ name: 'List', value: 'list', description: 'List all spaces', action: 'List all spaces', gateway: false },
		{ name: 'List Files', value: 'listFiles', description: 'List files in a space', action: 'List files in space', gateway: false },
		{ name: 'List Folder', value: 'listFolder', description: 'List the direct children of one folder in a space, files and subfolders', action: 'List folder contents in space', gateway: false },
		{ name: 'List Teams', value: 'listTeams', description: 'List teams assigned to a space', action: 'List teams in space', gateway: false },
		{ name: 'List Users', value: 'listUsers', description: 'List users assigned to a space', action: 'List users in space', gateway: false },
		{ name: 'Remove Team', value: 'removeTeam', description: 'Remove a team from a space', action: 'Remove team from space', gateway: false },
		{ name: 'Remove User', value: 'removeUser', description: 'Remove a user from a space', action: 'Remove user from space', gateway: false },
		{ name: 'Rename File', value: 'renameFile', description: 'Rename a file in place, keeping its embeddings and its upload metadata', action: 'Rename file in space', gateway: false },
		{ name: 'Sync', value: 'sync', description: 'Synchronize a linked space', action: 'Sync a space', gateway: false },
		{ name: 'Transfer File', value: 'transferFile', description: 'Move or copy a file between spaces. To rename a file inside its own space use Rename File, which keeps the embeddings a transfer does not promise to preserve.', action: 'Transfer file between spaces', gateway: false },
		{ name: 'Upload File', value: 'uploadFile', description: 'Upload a file to a space', action: 'Upload file to space', gateway: false },
	],
};

export const DEFAULT_RESOURCE = 'ai';
export const DEFAULT_OPERATION_PER_RESOURCE: Record<string, string> = {
	ai: 'createResponse',
	artifact: 'listAll',
	auditLog: 'list',
	chat: 'list',
	compliancePattern: 'list',
	dataset: 'list',
	datasetRow: 'list',
	miscellaneous: 'checkAuth',
	project: 'list',
	reference: 'listSpaces',
	space: 'list',
};

/**
 * 🔴 `resource` and `operation` as STATIC option arrays, and why that matters more than the
 * credential-aware filtering it replaces.
 *
 * n8n's node creator is **action-first**: it builds a node's entries in the nodes panel from the
 * static `options` of `resource` and `operation`, and from the `action` string on each operation.
 * Version 0.1.9 moved both parameters to `loadOptions`, which is evaluated only after a node is
 * already on the canvas. The node therefore produced **zero actions**, and searching the panel for
 * "oneai" found nothing at all - not the operations, not the node. Measured on a real instance:
 * this node 0 options / 0 actions, Slack 7 and 17 options / 7 actions, and even the minimal shipped
 * Perplexity node 1 and 1 / 4. `0.1.8` had static options and no `loadOptionsMethod` anywhere.
 *
 * The values are generated from the same `RESOURCES` / `OPERATIONS` the router validates against,
 * so they cannot drift apart, and they are byte-identical to what `loadOptions` returned - nothing
 * is renamed and no saved workflow changes meaning.
 *
 * What this costs, deliberately: a static list cannot be filtered by the credential, so a
 * Gateway-only credential now shows hub operations in the dropdown. `isOperationAllowed` still
 * refuses them at runtime with a message naming the reason. A worse dropdown for Gateway users beats
 * an invisible node for everyone.
 */
export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	default: DEFAULT_RESOURCE,
	options: RESOURCES.map((r) => ({
		name: r.name,
		value: r.value,
		description: r.description,
	})),
};

/**
 * One `operation` property per resource, each shown only for its own resource - the shape n8n's
 * own nodes use, and the one the node creator reads to build actions.
 */
// A default IS set below, from DEFAULT_OPERATION_PER_RESOURCE. The rule reads object literals
// statically and cannot see one that is computed, so it reports a missing default that is present.
// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
export const operationProperties: INodeProperties[] = RESOURCES.map((r) => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: [r.value],
		},
	},
	default: DEFAULT_OPERATION_PER_RESOURCE[r.value] ?? '',
	options: (OPERATIONS[r.value] ?? []).map((o) => ({
		name: o.name,
		value: o.value,
		description: o.description,
		action: o.action,
	})),
}));

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
