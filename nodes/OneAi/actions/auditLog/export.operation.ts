import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { oneAiApiRequestRaw } from '../../transport';
import { AUDIT_LOG_ORIGIN_OPTIONS } from './helpers';

/**
 * `POST /api/audit/logs/export` declares `application/octet-stream` on its 200 - a ZIP archive
 * holding one CSV or JSON file - so it is read through `oneAiApiRequestRaw` and never through
 * the JSON helper. Reading a binary endpoint through `oneAiApiRequest` is this repository's
 * recurring response-shape defect (`artifact:exportPdf`, `space:downloadFile`), and no drift tier
 * can see it: tier 1 only resolves the path and tier 3 compares the request.
 *
 * 🔴 `OUTPUT_FILE_NAME` and `OUTPUT_MIME_TYPE` are module constants because n8n's Compression node
 * dispatches on `binaryData.fileExtension` - NOT on the MIME type - and throws
 * `File extension not found for binary data` when it is absent.
 *
 * Which constant actually carries that was measured, not reasoned: this comment previously
 * credited the `.zip` suffix on the file name, and a live falsification on 2026-09-04 overturned
 * it. Stripping the suffix alone still works, because `prepareBinaryData` derives the extension
 * from the MIME type when the name does not supply one. Only breaking `OUTPUT_MIME_TYPE` as well
 * fails, with `Unsupported archive format ".bin"`. **`OUTPUT_MIME_TYPE` is the load-bearing
 * constant**; the suffix is belt and braces and worth keeping as such.
 *
 * There is deliberately no File Name option: an override's natural state includes extensionless
 * names. The name is echoed into `json` so a downstream Drive / S3 / email node can rename it.
 *
 * 🔴 `fields` is REQUIRED and has NO `required` list of its own, so `{}` is accepted and returns
 * an archive with no columns. The body is therefore built as all ten keys with explicit booleans,
 * never as a partial object: `Record<AuditLogExportField, boolean>` over a closed union makes a
 * missing key a compile error rather than an empty column set at runtime.
 *
 * The default is all ten selected, per the orchestrator's ruling: an audit export without
 * `userId` does not answer the question an audit export is opened to answer. Narrowing the
 * columns for data minimisation is one click, and the parameter description says so.
 *
 * Incoming `item.binary` is copied forward, so a binary property that arrived from an upstream
 * node survives this operation, as n8n's own Google Drive download does.
 */

/** The archive's name. The `.zip` suffix is what n8n's Compression node dispatches on. */
const OUTPUT_FILE_NAME = 'audit-logs.zip';

/** The archive's media type. Stated explicitly; `prepareBinaryData` sniffs only when it is not. */
const OUTPUT_MIME_TYPE = 'application/zip';

/** The ten optional columns of `fields`, verbatim from the spec's `additionalProperties: false` object. */
type AuditLogExportField =
	| 'action'
	| 'confidence'
	| 'matched'
	| 'model'
	| 'patternFilter'
	| 'patternId'
	| 'patternName'
	| 'reasoning'
	| 'riskLevel'
	| 'userId';

/** Every key present, always. A `Record` over the closed union is what enforces that. */
type AuditLogExportFields = Record<AuditLogExportField, boolean>;

export const description: INodeProperties[] = [
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		required: true,
		default: 'csv',
		description: 'The format of the single file inside the ZIP archive',
		options: [
			{ name: 'CSV', value: 'csv' },
			{ name: 'JSON', value: 'json' },
		],
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['export'],
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		required: true,
		default: [
			'action',
			'confidence',
			'matched',
			'model',
			'patternFilter',
			'patternId',
			'patternName',
			'reasoning',
			'riskLevel',
			'userId',
		],
		description:
			'Which columns to include in the export. All of them are selected by default, because an audit export is opened to answer who did what; deselect the ones an audience does not need for data minimisation, and note that deselecting all of them produces an archive with no columns.',
		options: [
			{
				name: 'Action',
				value: 'action',
				description: 'What the compliance layer did with the request',
			},
			{
				name: 'Confidence',
				value: 'confidence',
				description: 'How sure the compliance evaluation was',
			},
			{
				name: 'Matched Text',
				value: 'matched',
				description:
					'The content that triggered the pattern. It reproduces the sensitive text itself, so deselect it when the export leaves the compliance team.',
			},
			{ name: 'Model', value: 'model', description: 'The AI model the request was sent to' },
			{
				name: 'Pattern Filter',
				value: 'patternFilter',
				description: 'The filter expression of the pattern that matched',
			},
			{ name: 'Pattern ID', value: 'patternId', description: 'The ID of the pattern that matched' },
			{
				name: 'Pattern Name',
				value: 'patternName',
				description: 'The name of the pattern that matched',
			},
			{
				name: 'Reasoning',
				value: 'reasoning',
				description:
					'The compliance model explanation. It can quote the content it judged, so deselect it when the export leaves the compliance team.',
			},
			{
				name: 'Risk Level',
				value: 'riskLevel',
				description: 'The EU AI Act risk level the compliance evaluation assigned',
			},
			{
				name: 'User ID',
				value: 'userId',
				description:
					'Who made the request. It is personal data, and it is also the column that makes the export an audit trail at all.',
			},
		],
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['export'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		description: 'The binary property name to write the ZIP archive to',
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['export'],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['auditLog'],
				operation: ['export'],
			},
		},
		options: [
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Only export logs created at or after this time',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'options',
				default: 'onegateway:pattern',
				description: 'Only export logs from this origin',
				options: AUDIT_LOG_ORIGIN_OPTIONS,
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Only export logs created at or before this time',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const format = this.getNodeParameter('format', index) as 'csv' | 'json';
	const selectedFields = this.getNodeParameter('fields', index) as AuditLogExportField[];
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
	const filters = this.getNodeParameter('filters', index) as {
		from?: string;
		origin?: string;
		to?: string;
	};

	// Every one of the ten keys is written explicitly. `fields` is required but has no required
	// members, so a partial object is accepted and silently exports fewer columns than the author
	// selected; only a complete object can never be misread.
	const fields: AuditLogExportFields = {
		action: selectedFields.includes('action'),
		confidence: selectedFields.includes('confidence'),
		matched: selectedFields.includes('matched'),
		model: selectedFields.includes('model'),
		patternFilter: selectedFields.includes('patternFilter'),
		patternId: selectedFields.includes('patternId'),
		patternName: selectedFields.includes('patternName'),
		reasoning: selectedFields.includes('reasoning'),
		riskLevel: selectedFields.includes('riskLevel'),
		userId: selectedFields.includes('userId'),
	};

	const body: {
		format: 'csv' | 'json';
		fields: Record<string, boolean>;
		origin?: string;
		from?: string;
		to?: string;
	} = {
		format,
		fields,
	};

	if (filters.origin) {
		body.origin = filters.origin;
	}

	if (filters.from) {
		body.from = filters.from;
	}

	if (filters.to) {
		body.to = filters.to;
	}

	const archive = await oneAiApiRequestRaw.call(this, {
		method: 'POST',
		endpoint: '/api/audit/logs/export',
		body,
	});

	const binaryData = await this.helpers.prepareBinaryData(
		archive,
		OUTPUT_FILE_NAME,
		OUTPUT_MIME_TYPE,
	);

	const incomingBinary = this.getInputData()[index]?.binary;

	return [
		{
			json: {
				format,
				fileName: OUTPUT_FILE_NAME,
				mimeType: OUTPUT_MIME_TYPE,
				fields,
				filters,
			},
			binary: { ...incomingBinary, [binaryPropertyName]: binaryData },
			pairedItem: { item: index },
		},
	];
}
