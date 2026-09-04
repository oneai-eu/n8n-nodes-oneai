import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { splitList, type TableSummary } from '../dataset/helpers';

/**
 * How the input maps onto columns. The name and the first two values are n8n's own - Google
 * Sheets v2 `append` ships `dataMode: 'autoMapInputData' | 'defineBelow' | 'nothing'` and
 * Postgres v2 `insert` ships `'autoMapInputData' | 'defineBelow'` - taken over this repository's
 * `inputMode` because they are different concepts: `inputMode` is "how you hand me a message
 * array", `dataMode` is "how input maps to table columns".
 */
export type DataMode = 'autoMapInputData' | 'defineBelow' | 'json';

/** `POST …/rows` → 200. `ids[0]` is the new row's id, which is why `append` can return `rowId`. */
export type AppendRowResponse = {
	tableId: string;
	inserted: number;
	version: number;
	ids: string[];
	totalRowCount: number;
};

/** `PUT …/rows/{rowId}` → 200. `updated` is 0 when the id no longer exists - data, not an error. */
export type UpdateRowResponse = {
	updated: number;
	version: number;
	ids: string[];
	totalRowCount: number;
};

/** `DELETE …/rows` → 200. */
export type DeleteRowsResponse = {
	deleted: number;
	version: number;
	ids: string[];
	totalRowCount: number;
};

/** One entry of `GET …/rows` → `rows[]`. The id key is `id`; we surface it as `rowId`. */
export type TableRow = {
	id: string;
	data: IDataObject;
};

/** `GET …/rows` → 200. There is no `hasNextPage`; pagination terminates on `totalCount`. */
export type ListRowsResponse = {
	rows: TableRow[];
	totalCount: number;
};

const DATA_MODE_OPTIONS = [
	{
		name: 'Auto-Map Input Data to Columns',
		value: 'autoMapInputData',
		description: 'Use the incoming item as the row, matching its field names to column names',
	},
	{
		name: 'Map Each Column Below',
		value: 'defineBelow',
		description: 'Set the value of each column by hand',
	},
	{
		name: 'Raw JSON',
		value: 'json',
		description:
			'Provide the row as a JSON object. This is the only mode that preserves numbers, booleans and native JSON column values exactly, because the fields above hand every value over as a string.',
	},
];

/**
 * The `dataMode` selector. `modes` restricts which of the three are offered: `appendMany` does not
 * offer `defineBelow`, because one hand-typed set of column values across a whole batch would
 * write the same row N times.
 */
export function dataModeProperty(
	resource: string,
	operation: string,
	modes: DataMode[],
	defaultMode: DataMode,
): INodeProperties {
	return {
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		required: true,
		default: defaultMode,
		description: 'How the column values for the row are supplied',
		options: DATA_MODE_OPTIONS.filter((option) => modes.includes(option.value as DataMode)),
		displayOptions: {
			show: {
				resource: [resource],
				operation: [operation],
			},
		},
	};
}

/** The `defineBelow` editor: a list of `{ column, value }` pairs. */
export function columnsUiProperty(resource: string, operation: string): INodeProperties {
	return {
		displayName: 'Values to Send',
		name: 'columnsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Column',
		default: {},
		description: 'The column values to write. Every value is sent as a string.',
		displayOptions: {
			show: {
				resource: [resource],
				operation: [operation],
				dataMode: ['defineBelow'],
			},
		},
		options: [
			{
				displayName: 'Column',
				name: 'columnValues',
				values: [
					{
						displayName: 'Column',
						name: 'column',
						type: 'string',
						default: '',
						description: 'Name of the column to write',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to write into the column',
					},
				],
			},
		],
	};
}

/** The `json` editor: the whole row object, types intact. */
export function dataJsonProperty(resource: string, operation: string): INodeProperties {
	return {
		displayName: 'Data (JSON)',
		name: 'dataJson',
		type: 'json',
		default: '{\n  "column_name": "value"\n}',
		description: 'The row as a JSON object, keyed by column name',
		displayOptions: {
			show: {
				resource: [resource],
				operation: [operation],
				dataMode: ['json'],
			},
		},
	};
}

/** The shared `options` collection: the fields to drop before the row is built. */
export function ignoreFieldsOption(resource: string, operation: string): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [resource],
				operation: [operation],
			},
		},
		options: [
			{
				displayName: 'Fields to Ignore',
				name: 'ignoreFields',
				type: 'string',
				default: '',
				placeholder: '_metadata,internalId',
				description:
					'Comma-separated list of input fields to leave out of the row. The API rejects a value for a column it does not have, so a single extra key from an upstream node breaks every write until it is dropped here.',
			},
		],
	};
}

function removeIgnored(json: IDataObject, ignoreFields: string): IDataObject {
	const ignored = splitList(ignoreFields);
	if (ignored.length === 0) return { ...json };
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(json)) {
		if (!ignored.includes(key)) out[key] = value;
	}
	return out;
}

/**
 * Build one row's column values from whichever `dataMode` the author chose.
 *
 * 🔴 No type coercion happens here, and that is deliberate. `defineBelow` hands every value over
 * as a string, and whether the API turns `"42"` into a `BIGINT` is the API's business - guessing
 * on its behalf would produce values that look right and are not. `Raw JSON` is the mode that
 * carries types exactly, and its description says so.
 */
export function resolveRowData(
	this: IExecuteFunctions,
	index: number,
	json: IDataObject,
): IDataObject {
	const dataMode = this.getNodeParameter('dataMode', index) as DataMode;
	const options = this.getNodeParameter('options', index) as { ignoreFields?: string };

	if (dataMode === 'defineBelow') {
		const raw = this.getNodeParameter('columnsUi', index);
		const entries =
			typeof raw === 'object' && raw !== null
				? ((raw as { columnValues?: unknown }).columnValues ?? [])
				: [];
		const data: IDataObject = {};
		if (Array.isArray(entries)) {
			for (const entry of entries) {
				if (typeof entry !== 'object' || entry === null) continue;
				const { column, value } = entry as { column?: unknown; value?: unknown };
				if (typeof column !== 'string' || column === '') continue;
				data[column] = value as IDataObject[string];
			}
		}
		return data;
	}

	if (dataMode === 'json') {
		const raw = this.getNodeParameter('dataJson', index);
		let parsed: unknown = raw;
		if (typeof raw === 'string') {
			try {
				parsed = JSON.parse(raw);
			} catch {
				throw new NodeOperationError(this.getNode(), 'Data (JSON) is not valid JSON', {
					itemIndex: index,
				});
			}
		}
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw new NodeOperationError(this.getNode(), 'Data (JSON) must be a JSON object', {
				itemIndex: index,
				description: 'The row is a single object keyed by column name, not an array.',
			});
		}
		return removeIgnored(parsed as IDataObject, options.ignoreFields ?? '');
	}

	return removeIgnored(json, options.ignoreFields ?? '');
}

/**
 * RFC 4180. Quote a field that holds a quote, a comma, a carriage return or a newline, and double
 * any embedded quote. The export side is documented as RFC-4180, so the import dialect is the
 * same one.
 */
function csvEscape(field: string): string {
	if (/["\r\n,]/.test(field)) {
		return `"${field.replace(/"/g, '""')}"`;
	}
	return field;
}

/**
 * One cell.
 *
 * `null`/`undefined` become empty, which the API reads back as null. Objects and arrays are
 * serialised as JSON, because `import-csv` parses a JSON cell into a `JSON` column as a real
 * object - LIVE-PROVEN on devtest 2026-09-03, which is what retired the planned refusal.
 */
function csvCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return csvEscape(value);
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return csvEscape(String(value));
	}
	if (value instanceof Date) return csvEscape(value.toISOString());
	return csvEscape(JSON.stringify(value));
}

/** Serialise a header and rows into one RFC-4180 CSV document. */
export function buildCsv(header: string[], rows: IDataObject[]): string {
	const lines = [header.map((column) => csvEscape(column)).join(',')];
	for (const row of rows) {
		lines.push(header.map((column) => csvCell(row[column])).join(','));
	}
	return `${lines.join('\r\n')}\r\n`;
}

/**
 * The header row, and the rejection of anything that is not a column.
 *
 * With a known table the header is the table's own column order, restricted to the columns some
 * item actually supplies - so the CSV is ordered by the schema and not by whichever item happened
 * to arrive first. A key that is not a column is a hard error naming the column and the item,
 * because the API rejecting an unknown column is the signal that the upstream shape changed;
 * dropping it silently would turn that into a row that quietly lost a field.
 *
 * With no table (`Create Table if Missing`) there is nothing to check against, so the header is
 * the union of every item's keys in first-seen order.
 */
export function buildHeader(
	this: IExecuteFunctions,
	rows: IDataObject[],
	table: TableSummary | null,
): string[] {
	const seen: string[] = [];
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (!seen.includes(key)) seen.push(key);
		}
	}

	if (table === null) return seen;

	const columnNames = table.columns.map((column) => column.name);
	for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
		for (const key of Object.keys(rows[rowIndex])) {
			if (!columnNames.includes(key)) {
				throw new NodeOperationError(
					this.getNode(),
					`Input item ${rowIndex} has a field "${key}", which is not a column of the table "${table.name}"`,
					{
						itemIndex: rowIndex,
						description:
							`The table's columns are: ${columnNames.join(', ')}. ` +
							'Add the column with the Dataset > Update Schema operation, or list the field under Options > Fields to Ignore.',
					},
				);
			}
		}
	}

	return columnNames.filter((name) => seen.includes(name));
}
