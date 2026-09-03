import type { INode, INodeProperties, INodePropertyOptions, JsonObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Shapes taken from `openapi/openapi.json`, not from prose. They are `type` aliases rather than
 * `interface`s on purpose: a type alias gets an implicit index signature, so a value of one of
 * these types is assignable to `IDataObject` and can be handed to `returnJsonArray` without a
 * cast. An `interface` would force `as IDataObject` at every emit site, which is exactly the
 * kind of cast the house rules ask us not to write.
 */

/** `GET|POST|PATCH …/tables` — the DuckDB column types the API accepts, verbatim from the enum. */
export const COLUMN_TYPES = [
	'BOOLEAN',
	'BIGINT',
	'DOUBLE',
	'VARCHAR',
	'DATE',
	'TIME',
	'TIMESTAMP',
	'TIMESTAMPTZ',
	'UUID',
	'JSON',
] as const;

export type ColumnType = (typeof COLUMN_TYPES)[number];

export type ColumnDefinition = {
	name: string;
	type: ColumnType;
};

export type RenameColumn = {
	from: string;
	to: string;
};

/** One entry of `GET /api/spaces/{spaceId}/tables` → `tables[]`. */
export type TableSummary = {
	name: string;
	description: string | null;
	columns: ColumnDefinition[];
	rowCount: number;
	embeddingStatus: string | null;
};

/** `POST /api/spaces/{spaceId}/tables` → 200. */
export type CreateTableResponse = {
	tableId: string;
	version: number;
};

/** `PATCH /api/spaces/{spaceId}/tables/{tableName}` → 200. */
export type UpdateSchemaResponse = {
	tableId: string;
	columns: ColumnDefinition[];
	version: number;
};

/** `POST …/import-csv` → 200. Note: no row ids, which is why `appendMany` cannot return any. */
export type ImportCsvResponse = {
	tableId: string;
	created: boolean;
	inserted: number;
	version: number;
	totalRowCount: number;
};

/**
 * The column-type picker. n8n's `node-param-options-type-unsorted-items` requires the options to
 * be sorted by display name, which is why this is not in the spec's enum order.
 *
 * The JSON note is the spec's own warning, carried across because it is the one type whose
 * misuse is silent: a stringified JSON value is stored as an opaque scalar and `json_extract`
 * over it returns null.
 */
export const COLUMN_TYPE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'BIGINT', value: 'BIGINT', description: '64-bit integer' },
	{ name: 'BOOLEAN', value: 'BOOLEAN', description: 'True or false' },
	{ name: 'DATE', value: 'DATE', description: "Calendar date, formatted 'YYYY-MM-DD'" },
	{ name: 'DOUBLE', value: 'DOUBLE', description: 'Double-precision floating point number' },
	{
		name: 'JSON',
		value: 'JSON',
		description:
			'Native JSON object or array. Pass the value as an object ({"kind": "smoke"}), not as a stringified JSON value - a JSON string is stored as an opaque scalar, so json_extract over it returns null.',
	},
	{ name: 'TIME', value: 'TIME', description: 'Time of day, without a date' },
	{
		name: 'TIMESTAMP',
		value: 'TIMESTAMP',
		description: "Date and time without a zone, formatted 'YYYY-MM-DD HH:MM:SS'",
	},
	{ name: 'TIMESTAMPTZ', value: 'TIMESTAMPTZ', description: 'Date and time with a time zone' },
	{ name: 'UUID', value: 'UUID', description: 'UUID value' },
	{ name: 'VARCHAR', value: 'VARCHAR', description: 'Text of any length' },
];

/** The `{ name, type }` pair shared by `dataset:create` and `dataset:updateSchema`. */
export const columnDefinitionValues: INodeProperties[] = [
	{
		displayName: 'Column Name',
		name: 'name',
		type: 'string',
		default: '',
		description:
			'Identifier only: starts with a letter or underscore, then letters, digits or underscores. No spaces or punctuation.',
	},
	{
		displayName: 'Column Type',
		name: 'type',
		type: 'options',
		options: COLUMN_TYPE_OPTIONS,
		default: 'VARCHAR',
		description: 'DuckDB type of the column. Every column is nullable.',
	},
];

/**
 * Read a `fixedCollection` of column definitions into the array the API takes.
 *
 * The n8n value is `{ column: [{ name, type }, …] }`, or `{}` when the author added nothing.
 */
export function extractColumns(raw: unknown): ColumnDefinition[] {
	if (typeof raw !== 'object' || raw === null) return [];
	const entries = (raw as { column?: unknown }).column;
	if (!Array.isArray(entries)) return [];
	const columns: ColumnDefinition[] = [];
	for (const entry of entries) {
		if (typeof entry !== 'object' || entry === null) continue;
		const { name, type } = entry as { name?: unknown; type?: unknown };
		if (typeof name !== 'string' || name === '') continue;
		const columnType = COLUMN_TYPES.find((t) => t === type) ?? 'VARCHAR';
		columns.push({ name, type: columnType });
	}
	return columns;
}

/** Read a `fixedCollection` of `{ from, to }` renames into the array the API takes. */
export function extractRenames(raw: unknown): RenameColumn[] {
	if (typeof raw !== 'object' || raw === null) return [];
	const entries = (raw as { rename?: unknown }).rename;
	if (!Array.isArray(entries)) return [];
	const renames: RenameColumn[] = [];
	for (const entry of entries) {
		if (typeof entry !== 'object' || entry === null) continue;
		const { from, to } = entry as { from?: unknown; to?: unknown };
		if (typeof from !== 'string' || from === '') continue;
		if (typeof to !== 'string' || to === '') continue;
		renames.push({ from, to });
	}
	return renames;
}

/** Split a comma-separated parameter into trimmed, non-empty entries. */
export function splitList(raw: string): string[] {
	return raw
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

/** `GET /api/spaces/{spaceId}/tables` → the `tables` array, typed. */
export function readTables(response: JsonObject): TableSummary[] {
	const tables = response.tables;
	return Array.isArray(tables) ? (tables as TableSummary[]) : [];
}

/**
 * The pre-flight check behind `Create Table if Missing = false`.
 *
 * `import-csv` creates a table it does not find, with all-VARCHAR columns, and returns 200. A
 * typo in the table name therefore lands every row in a brand-new shadow table while the real
 * dataset stays empty and nothing in the workflow reports anything. That is a silent wrong
 * result, so one `GET …/tables` per node execution buys a named error instead.
 *
 * It also yields the authoritative column list, which is what orders the CSV header.
 */
export function requireTable(
	node: INode,
	tables: TableSummary[],
	tableName: string,
	itemIndex: number,
): TableSummary {
	const table = tables.find((t) => t.name === tableName);
	if (table) return table;

	const known = tables.map((t) => t.name).sort();
	throw new NodeOperationError(node, `The table "${tableName}" does not exist in this space`, {
		itemIndex,
		description:
			(known.length > 0
				? `The space holds: ${known.join(', ')}.`
				: 'The space holds no tables yet.') +
			' Create it first with the Dataset > Create operation, or turn on "Create Table if Missing" to let the CSV import create it with all-VARCHAR columns.',
	});
}
