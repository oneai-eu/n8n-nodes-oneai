#!/usr/bin/env node
/**
 * drift-check — the standing comparison between oneAI's API and what this node actually ships.
 *
 * Usage:
 *   node scripts/drift-check.mjs            human-readable report
 *   node scripts/drift-check.mjs --json     machine-readable report on stdout
 *   node scripts/drift-check.mjs --verbose  also list every operation that is clean
 *
 * Exit code: 0 = no path or shape failures. 1 = failures. 2 = the extractor is broken
 * (see "Vacuity guards"). Missing coverage is never a failure — see tier 2.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE IS SHAPED THE WAY IT IS
 * ---------------------------------------------------------------------------
 *
 * Three design decisions here are not stylistic. Each one exists because the obvious
 * alternative produced a confident, wrong answer on 2026-09-03.
 *
 * 1. IT PARSES THE ROUTER, NOT THE DIRECTORY LISTING.
 *    Roughly 28 `*.operation.ts` files are commented out of `actions/router.ts` and of the
 *    node's property list. They sit in the repository, no lint rule sees them, and any check
 *    that counts files counts them. `actions/router.ts` plus `modes.ts` are the only
 *    authorities on what a workflow can actually reach, so that is what we parse. Comments are
 *    stripped before parsing, which is precisely what makes a commented-out arm disappear.
 *
 * 2. IT HAS VACUITY GUARDS, AND THEY EXIT NON-ZERO.
 *    An earlier extractor searched the operation files for `url:`. The field is called
 *    `endpoint:`. It matched nothing and reported "0 of 409 endpoints covered - every area NOT
 *    COVERED AT ALL", which reads like a dramatic finding and was pure measurement failure.
 *    A check that can report a comfortable (or dramatic) answer while measuring nothing is
 *    worse than no check. So: if the router yields implausibly few operations, if the spec has
 *    no paths, or if any single shipped operation yields no readable request, this exits 2 and
 *    says the extractor is broken. It never prints a zero table.
 *
 * 3. THERE IS A SHAPE TIER, AND IT IS THE POINT.
 *    A path-level check answers "does the URL still resolve?". That is the cheap half.
 *    The failure it structurally cannot see is the one that actually happens:
 *
 *        the path is unchanged, and the request body renamed a field.
 *
 *    `POST /api/x` still exists, still returns 200 for somebody, and our call now sends a field
 *    the schema rejects or omits one it requires. Nothing in the node fails at build time,
 *    nothing fails at lint time, and every path-level report stays green. It breaks at runtime,
 *    in a stranger's n8n instance, on a workflow we cannot see. Yedra emits request bodies with
 *    `additionalProperties: false` and an explicit `required` list, so "a field that no longer
 *    exists" and "a required field we omit" are both decidable against the spec rather than
 *    guessed. That is tier 3, and it is why this script parses request objects at all instead
 *    of just collecting endpoint strings.
 *
 * The parser is hand-rolled and dependency-free on purpose: this repository has no committed
 * lockfile and no `node_modules` in a fresh clone, and CI pins Node 22. A drift check that only
 * runs after a successful `npm install`, or only on a Node new enough to strip types from a
 * `.ts` file, is a drift check that quietly stops running. Everything below is plain ES modules
 * against the Node standard library.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ACTIONS_DIR = join(ROOT, 'nodes', 'OneAi', 'actions');
const ROUTER_FILE = join(ACTIONS_DIR, 'router.ts');
const MODES_FILE = join(ROOT, 'nodes', 'OneAi', 'modes.ts');
const SPEC_FILE = join(ROOT, 'openapi', 'openapi.json');

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

/**
 * Vacuity floors. These are deliberately well below the real numbers (49 shipped operations,
 * 8 resources, 325 spec paths, 401 spec operations at the time of writing) and well above zero.
 * They are not assertions about the current surface; they are a tripwire for "the extractor
 * stopped matching". Raising them to track the real numbers would turn every legitimate
 * removal into a false alarm; lowering them to zero is the bug this whole file guards against.
 */
const FLOORS = {
	resources: 5,
	operations: 35,
	requestsExtracted: 35,
	specPaths: 50,
	specOperations: 100,
};

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const VERBOSE = argv.includes('--verbose');

// ---------------------------------------------------------------------------
// Source scanning primitives
// ---------------------------------------------------------------------------

/**
 * Remove `//` and block comments while leaving string and template literals intact.
 *
 * This is the single most load-bearing function in the file: stripping comments is what makes a
 * commented-out router arm invisible, which is the difference between measuring the shipped
 * surface and measuring the directory. It tracks quoting state so that a `//` inside a URL
 * string is not mistaken for a comment, and it does not attempt to understand regex literals -
 * a `/` is only treated as a comment opener when the next character is `/` or `*`, which no
 * regex literal in this tree begins with.
 */
function stripComments(src) {
	let out = '';
	let i = 0;
	const n = src.length;
	// quote: null | "'" | '"' | '`'
	let quote = null;
	// Brace depth while outside any quote. Template interpolations record the depth they opened
	// at, so `${ foo({ a: 1 }) }` closes the interpolation on the RIGHT brace and not on the
	// inner object's. Getting this wrong desynchronises every brace count downstream.
	let braceDepth = 0;
	const templateStack = [];

	while (i < n) {
		const c = src[i];
		const next = src[i + 1];

		if (quote) {
			if (c === '\\') {
				out += c + (next ?? '');
				i += 2;
				continue;
			}
			if (quote === '`' && c === '$' && next === '{') {
				templateStack.push(braceDepth);
				quote = null;
				out += '${';
				i += 2;
				continue;
			}
			if (c === quote) {
				quote = null;
				out += c;
				i += 1;
				continue;
			}
			out += c;
			i += 1;
			continue;
		}

		if (c === '}' && templateStack.length > 0 && braceDepth === templateStack[templateStack.length - 1]) {
			templateStack.pop();
			quote = '`';
			out += c;
			i += 1;
			continue;
		}

		if (c === '{') braceDepth += 1;
		else if (c === '}') braceDepth -= 1;

		if (c === "'" || c === '"' || c === '`') {
			quote = c;
			out += c;
			i += 1;
			continue;
		}

		if (c === '/' && next === '/') {
			while (i < n && src[i] !== '\n') i += 1;
			continue; // keep the newline itself on the next iteration
		}

		if (c === '/' && next === '*') {
			i += 2;
			while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
				// preserve newlines so line numbers in any future message stay usable
				if (src[i] === '\n') out += '\n';
				i += 1;
			}
			i += 2;
			continue;
		}

		out += c;
		i += 1;
	}
	return out;
}

/**
 * Given the index of an opening bracket, return the index of its match, respecting
 * strings and template interpolation. Returns -1 if unbalanced.
 */
function matchBracket(src, start) {
	const open = src[start];
	const close = open === '{' ? '}' : open === '(' ? ')' : open === '[' ? ']' : null;
	if (!close) return -1;
	let depth = 0;
	let braceDepth = 0;
	let i = start;
	let quote = null;
	const templateStack = [];
	while (i < src.length) {
		const c = src[i];
		if (quote) {
			if (c === '\\') { i += 2; continue; }
			if (quote === '`' && c === '$' && src[i + 1] === '{') { templateStack.push(braceDepth); quote = null; i += 2; continue; }
			if (c === quote) quote = null;
			i += 1;
			continue;
		}
		// close a `${ ... }` interpolation only at the depth it was opened at
		if (c === '}' && templateStack.length > 0 && braceDepth === templateStack[templateStack.length - 1]) {
			templateStack.pop();
			quote = '`';
			i += 1;
			continue;
		}
		if (c === '{') braceDepth += 1;
		else if (c === '}') braceDepth -= 1;
		if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
		if (c === open) depth += 1;
		else if (c === close) {
			depth -= 1;
			if (depth === 0) return i;
		}
		i += 1;
	}
	return -1;
}

/**
 * Split the inside of an object literal / type literal into top-level `key: value` entries,
 * ignoring separators nested inside brackets or quotes.
 */
function splitTopLevel(inner, separators = [',']) {
	const parts = [];
	let buf = '';
	let depth = 0;
	let quote = null;
	const templateStack = [];
	for (let i = 0; i < inner.length; i++) {
		const c = inner[i];
		if (quote) {
			buf += c;
			if (c === '\\') { buf += inner[i + 1] ?? ''; i += 1; continue; }
			if (quote === '`' && c === '$' && inner[i + 1] === '{') { templateStack.push(depth); quote = null; buf += '{'; depth += 1; i += 1; continue; }
			if (c === quote) quote = null;
			continue;
		}
		// close a `${ ... }` interpolation only at the depth it was opened at
		if (c === '}' && templateStack.length > 0 && depth - 1 === templateStack[templateStack.length - 1]) {
			templateStack.pop();
			quote = '`';
			depth -= 1;
			buf += c;
			continue;
		}
		if (c === "'" || c === '"' || c === '`') { quote = c; buf += c; continue; }
		if (c === '{' || c === '[' || c === '(' || c === '<') depth += 1;
		else if (c === '}' || c === ']' || c === ')' || c === '>') depth -= 1;
		if (depth === 0 && separators.includes(c)) { parts.push(buf); buf = ''; continue; }
		buf += c;
	}
	if (buf.trim()) parts.push(buf);
	return parts.map((p) => p.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Input A, part 1: the dispatched surface (router.ts)
// ---------------------------------------------------------------------------

/**
 * `router.ts` is the authority on what ships. Read the outer `switch (resource)` and, inside
 * each arm, the inner `switch (operation)`. Every `case` we find has survived comment
 * stripping, so it is genuinely reachable.
 */
function readRouterSurface() {
	if (!existsSync(ROUTER_FILE)) {
		fatal(`router not found at ${ROUTER_FILE}`);
	}
	const raw = readFileSync(ROUTER_FILE, 'utf8');
	const src = stripComments(raw);

	// `import * as chat from './chat';` -> alias `chat` maps to directory `chat`
	const aliasToDir = new Map();
	for (const m of src.matchAll(/import\s+\*\s+as\s+(\w+)\s+from\s+'\.\/([\w-]+)'/g)) {
		aliasToDir.set(m[1], m[2]);
	}

	// Locate the outer `switch (resource)` body.
	const outerIdx = src.search(/switch\s*\(\s*resource\s*\)\s*\{/);
	if (outerIdx === -1) return { resources: [], operations: [], aliasToDir };
	const outerOpen = src.indexOf('{', outerIdx);
	const outerClose = matchBracket(src, outerOpen);
	if (outerClose === -1) fatal('router.ts: unbalanced braces in `switch (resource)`');
	const outerBody = src.slice(outerOpen + 1, outerClose);

	const operations = [];
	const resources = [];

	// Each resource arm: `case 'space':` ... up to the next top-level `case`/`default`.
	const caseRe = /case\s+'([\w-]+)'\s*:/g;
	const marks = [];
	let m;
	while ((m = caseRe.exec(outerBody))) {
		// only top-level cases belong to the outer switch; nested ones sit inside an inner
		// `switch (operation) { ... }` block, so measure bracket depth at this offset
		if (depthAt(outerBody, m.index) === 0) marks.push({ name: m[1], index: m.index });
	}
	for (let k = 0; k < marks.length; k++) {
		const resource = marks[k].name;
		const from = marks[k].index;
		const to = k + 1 < marks.length ? marks[k + 1].index : outerBody.length;
		const arm = outerBody.slice(from, to);
		resources.push(resource);

		const innerIdx = arm.search(/switch\s*\(\s*operation\s*\)\s*\{/);
		if (innerIdx === -1) continue;
		const innerOpen = arm.indexOf('{', innerIdx);
		const innerClose = matchBracket(arm, innerOpen);
		const innerBody = arm.slice(innerOpen + 1, innerClose === -1 ? arm.length : innerClose);

		// `case 'addTeam': responseData = await space.addTeam.execute.call(this, i);`
		// The module alias and the exported binding are BOTH needed: the operation value and the
		// export name are not always the same (`compliancePattern` dispatches `'delete'` to the
		// export `deletePattern`, and `misc` is imported under the alias `auth`).
		const opRe = /case\s+'([\w-]+)'\s*:\s*(?:responseData\s*=\s*)?await\s+(\w+)\.(\w+)\.execute/g;
		let om;
		while ((om = opRe.exec(innerBody))) {
			operations.push({
				resource,
				operation: om[1],
				alias: om[2],
				exportName: om[3],
				dir: aliasToDir.get(om[2]) ?? null,
			});
		}
	}

	// ---- the pre-loop `executeAll` arms ------------------------------------
	//
	// Not every dispatched operation sits in the `switch`. An operation that runs ONCE for the
	// whole input rather than once per item cannot live inside the item loop, so it is dispatched
	// from an explicit `if` placed before it:
	//
	//     if (resource === 'datasetRow' && operation === 'appendMany') {
	//         return [await datasetRow.appendMany.executeAll.call(this, items)];
	//     }
	//
	// This reader matched only `.execute.call`, so such an arm was invisible: its API call was
	// never compared against the spec while this tool printed a confident, clean table. That is
	// the exact failure class this file exists to prevent, so the shape is read here explicitly -
	// and, like everything else, only after comments have been stripped.
	const allRe =
		/resource\s*===\s*'([\w-]+)'\s*&&\s*operation\s*===\s*'([\w-]+)'[\s\S]{0,400}?await\s+(\w+)\.(\w+)\.executeAll\b/g;
	let am;
	while ((am = allRe.exec(src))) {
		const [, resource, operation, alias, exportName] = am;
		if (operations.some((o) => o.resource === resource && o.operation === operation)) continue;
		if (!resources.includes(resource)) resources.push(resource);
		operations.push({
			resource,
			operation,
			alias,
			exportName,
			dir: aliasToDir.get(alias) ?? null,
			dispatch: 'executeAll',
		});
	}

	return { resources, operations, aliasToDir };
}

function depthAt(src, index) {
	let depth = 0;
	let quote = null;
	for (let i = 0; i < index; i++) {
		const c = src[i];
		if (quote) {
			if (c === '\\') { i += 1; continue; }
			if (c === quote) quote = null;
			continue;
		}
		if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
		if (c === '{') depth += 1;
		else if (c === '}') depth -= 1;
	}
	return depth;
}

// ---------------------------------------------------------------------------
// Input A, part 2: the registry (modes.ts)
// ---------------------------------------------------------------------------

/**
 * `modes.ts` (added in 0.1.9) gates dispatch: `isOperationAllowed` runs BEFORE the router's
 * switch, so an operation must appear in BOTH to be reachable. Reconciling the two is therefore
 * not bookkeeping - a router arm missing from the registry is dead code that can never be
 * selected, and a registry entry missing from the router is an operation the UI offers and the
 * node then rejects at runtime with "Unknown operation". Either direction is a real finding.
 */
function readModesRegistry() {
	if (!existsSync(MODES_FILE)) return null;
	const src = stripComments(readFileSync(MODES_FILE, 'utf8'));

	const resources = [];
	// Anchor on the assignment, not on the identifier: `RESOURCES: ResourceDefinition[] = [`
	// contains an earlier `[` (the array-type suffix) that is not the array literal.
	const resMatch = src.match(/\bRESOURCES\b[^=]*=\s*\[/);
	const resIdx = resMatch ? resMatch.index : -1;
	if (resIdx !== -1) {
		const open = src.indexOf('[', resIdx + resMatch[0].length - 1);
		const close = matchBracket(src, open);
		const body = src.slice(open + 1, close);
		for (const entry of splitTopLevel(body)) {
			const v = entry.match(/value:\s*'([\w-]+)'/);
			const g = entry.match(/gateway:\s*(true|false)/);
			if (v) resources.push({ value: v[1], gateway: g ? g[1] === 'true' : null });
		}
	}

	const operations = [];
	const opMatch = src.match(/\bOPERATIONS\b[^=]*=\s*\{/);
	const opIdx = opMatch ? opMatch.index : -1;
	if (opIdx !== -1) {
		const open = src.indexOf('{', opIdx + opMatch[0].length - 1);
		const close = matchBracket(src, open);
		const body = src.slice(open + 1, close);
		for (const group of splitTopLevel(body)) {
			const head = group.match(/^([\w-]+)\s*:\s*\[/);
			if (!head) continue;
			const resource = head[1];
			const aOpen = group.indexOf('[');
			const aClose = matchBracket(group, aOpen);
			const arr = group.slice(aOpen + 1, aClose);
			for (const entry of splitTopLevel(arr)) {
				const v = entry.match(/value:\s*'([\w-]+)'/);
				const g = entry.match(/gateway:\s*(true|false)/);
				if (v) operations.push({ resource, operation: v[1], gateway: g ? g[1] === 'true' : null });
			}
		}
	}
	return { resources, operations };
}

// ---------------------------------------------------------------------------
// Input A, part 3: export name -> file, via each resource's index.ts
// ---------------------------------------------------------------------------

function readExportMap(dir) {
	const indexFile = join(ACTIONS_DIR, dir, 'index.ts');
	if (!existsSync(indexFile)) return new Map();
	const src = stripComments(readFileSync(indexFile, 'utf8'));

	// local binding -> file, e.g. `import * as del from './delete.operation';`
	const localToFile = new Map();
	for (const m of src.matchAll(/import\s+\*\s+as\s+(\w+)\s+from\s+'\.\/([\w.-]+)'/g)) {
		localToFile.set(m[1], `${m[2]}.ts`);
	}

	// exported name -> local binding, e.g. `export { create, del as delete, exportPdf };`
	const exportToFile = new Map();
	for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
		for (const spec of m[1].split(',')) {
			const t = spec.trim();
			if (!t) continue;
			const asMatch = t.match(/^(\w+)\s+as\s+(\w+)$/);
			const local = asMatch ? asMatch[1] : t;
			const exported = asMatch ? asMatch[2] : t;
			if (localToFile.has(local)) exportToFile.set(exported, localToFile.get(local));
		}
	}
	return exportToFile;
}

// ---------------------------------------------------------------------------
// Input A, part 4: the request each operation issues
// ---------------------------------------------------------------------------

/** The four transport helpers. Anything calling the API goes through one of them. */
const REQUEST_HELPERS = {
	oneAiApiRequest: { kind: 'json' },
	oneAiApiRequestRaw: { kind: 'json' },          // JSON request body, binary response
	oneAiApiRequestBinary: { kind: 'binary-body' },// raw Buffer body - not shape-checkable
	oneAiApiRequestAllItems: { kind: 'paginated' },// injects page/pageSize into qs itself
};

/**
 * Map a TypeScript type annotation onto a JSON Schema type name, conservatively.
 * Anything we cannot place returns null, and null NEVER produces a mismatch finding -
 * silence beats a false positive in a tool whose credibility is the product.
 */
function tsTypeToJson(t) {
	if (!t) return null;
	const s = t.replace(/\s+/g, ' ').trim().replace(/\|\s*undefined$/, '').trim();
	if (/\[\]$/.test(s) || /^Array</.test(s) || /^readonly /.test(s)) return 'array';
	if (/^string$/.test(s)) return 'string';
	if (/^number$/.test(s)) return 'number';
	if (/^boolean$/.test(s)) return 'boolean';
	if (/^IDataObject$/.test(s) || /^\{/.test(s) || /^Record</.test(s)) return 'object';
	if (/^'.*'$/.test(s)) return 'string';
	return null;
}

/** Parse `{ a: string; b?: number }` into key -> {type, optional}. */
function parseTypeLiteral(text) {
	const out = new Map();
	const open = text.indexOf('{');
	if (open === -1) return out;
	const close = matchBracket(text, open);
	if (close === -1) return out;
	const inner = text.slice(open + 1, close);
	for (const entry of splitTopLevel(inner, [';', ','])) {
		const m = entry.match(/^(\w+)(\?)?\s*:\s*([\s\S]+)$/);
		if (m) out.set(m[1], { type: tsTypeToJson(m[3]), optional: Boolean(m[2]) });
	}
	return out;
}

/**
 * Build a map of local identifier -> JSON type from `getNodeParameter` reads, e.g.
 *   const spaceId = this.getNodeParameter('spaceId', index) as string;
 *   const filters = this.getNodeParameter('filters', index) as { search?: string };
 * The second form also records its member types, so `filters.search` can be typed later.
 */
function buildTypeMap(scope) {
	const idType = new Map();
	const memberTypes = new Map();
	const re = /const\s+(\w+)\s*(?::\s*[^=]+?)?=\s*(?:await\s+)?this\.getNodeParameter\(/g;
	let m;
	while ((m = re.exec(scope))) {
		const name = m[1];
		const argsOpen = scope.indexOf('(', m.index + m[0].length - 1);
		const argsClose = matchBracket(scope, argsOpen);
		if (argsClose === -1) continue;
		// everything between the call's `)` and the terminating `;` is the `as T` assertion
		const tail = scope.slice(argsClose + 1, scope.indexOf(';', argsClose) + 1);
		const asMatch = tail.match(/as\s+([\s\S]+?);\s*$/);
		if (!asMatch) continue;
		const ann = asMatch[1].trim();
		idType.set(name, tsTypeToJson(ann));
		if (ann.startsWith('{')) memberTypes.set(name, parseTypeLiteral(ann));
	}
	// plain local consts with an obvious literal value, e.g. `const model = 'x';`
	return { idType, memberTypes };
}

function inferValueType(expr, types) {
	const e = expr.trim();
	if (/^'/.test(e) || /^"/.test(e) || /^`/.test(e)) return 'string';
	if (/^-?\d+(\.\d+)?$/.test(e)) return 'number';
	if (/^(true|false)$/.test(e)) return 'boolean';
	if (/^\[/.test(e)) return 'array';
	if (/^\{/.test(e)) return 'object';
	// `additionalOptions.model || 'gpt-4o-mini-tts'` - take the first branch we can type
	for (const alt of e.split('||')) {
		const a = alt.trim();
		if (/^'/.test(a) || /^"/.test(a) || /^`/.test(a)) return 'string';
		const mem = a.match(/^(\w+)\.(\w+)$/);
		if (mem && types.memberTypes.has(mem[1])) {
			const t = types.memberTypes.get(mem[1]).get(mem[2]);
			if (t?.type) return t.type;
		}
		if (types.idType.has(a)) {
			const t = types.idType.get(a);
			if (t) return t;
		}
	}
	return null;
}

/**
 * Resolve the value of the `body:` / `qs:` property of a request options object into a set of
 * keys with types and whether we always send them.
 *
 * Two forms occur in this tree and both must work:
 *   - an inline literal:  `body: { teamId, canWrite }`
 *   - a hoisted variable: `const body: { name: string; description?: string } = { name };`
 *                         `if (x) body.description = x;`  ...later...  `body,`
 * The second is the common one for anything with optional fields, and it is exactly the shape a
 * naive "grab the object literal after `body:`" reader gets wrong.
 */
function resolveFields(valueExpr, scope, types) {
	const expr = valueExpr.trim();

	if (expr.startsWith('{')) {
		return { keys: literalKeys(expr, scope, types), opaque: false, source: 'inline' };
	}

	const ident = expr.match(/^(\w+)$/);
	if (!ident) return { keys: new Map(), opaque: true, source: 'expression', note: expr.slice(0, 60) };

	const name = ident[1];

	// A Buffer body (binary upload) has no JSON shape to check.
	if (/getBinaryDataBuffer|Buffer\.from/.test(declInitializer(scope, name) ?? '')) {
		return { keys: new Map(), opaque: true, source: 'binary' };
	}

	const keys = new Map();

	// declared type annotation: `const body: { a: string; b?: number } = ...`
	const declRe = new RegExp(`const\\s+${name}\\s*:\\s*`, 'g');
	const dm = declRe.exec(scope);
	if (dm) {
		const after = scope.slice(dm.index + dm[0].length);
		if (after.trimStart().startsWith('{')) {
			const declared = parseTypeLiteral(after);
			for (const [k, v] of declared) keys.set(k, { type: v.type, always: !v.optional, via: 'declared-type' });
		} else if (/^IDataObject/.test(after.trimStart())) {
			// `const body: IDataObject = {...}` - the annotation says nothing; fall through to
			// the initializer and assignments below.
		}
	}

	// initializer object literal
	const init = declInitializer(scope, name);
	if (init && init.trimStart().startsWith('{')) {
		for (const [k, v] of literalKeys(init.trim(), scope, types)) {
			keys.set(k, { type: v.type ?? keys.get(k)?.type ?? null, always: true, via: 'initializer' });
		}
	}

	// assignments: `body.description = additionalFields.description;`
	//
	// Whether one is always reached is decided by brace depth, not by assuming the worst. An
	// assignment at the same depth as the declaration is straight-line code and IS always sent;
	// a deeper one sits inside an `if` (or a loop, or a `try`) and is not. Treating every
	// assignment as conditional reported `space.listFiles` as never sending the required
	// `pageSize` when the line `qs.pageSize = limit;` is unguarded two statements above the
	// call - a false positive, which is the one kind of finding this tool cannot afford.
	//
	// This is deliberately not flow analysis: an unguarded assignment placed after an early
	// `return` still counts as always-sent for every call in the file. That direction can only
	// hide a finding, never invent one.
	const declDepth = declarationDepth(scope, name);
	const asgRe = new RegExp(`\\b${name}\\.(\\w+)\\s*=\\s*([^;]+);`, 'g');
	let am;
	while ((am = asgRe.exec(scope))) {
		const k = am[1];
		const prev = keys.get(k);
		const unguarded = declDepth !== null && depthAt(scope, am.index) === declDepth;
		keys.set(k, {
			type: inferValueType(am[2], types) ?? prev?.type ?? null,
			always: unguarded || (prev?.always === true && prev?.via === 'initializer'),
			via: 'assignment',
		});
	}

	if (keys.size === 0 && !init) {
		return { keys, opaque: true, source: 'unresolved', note: name };
	}
	return { keys, opaque: false, source: 'variable' };
}

/** Brace depth of the `const <name>` declaration, or null when there is none. */
function declarationDepth(scope, name) {
	const m = new RegExp(`const\\s+${name}\\b`).exec(scope);
	return m ? depthAt(scope, m.index) : null;
}

/** Return the initializer text of `const <name> ... = <init>;` inside the scope. */
function declInitializer(scope, name) {
	const re = new RegExp(`const\\s+${name}\\b`, 'g');
	const m = re.exec(scope);
	if (!m) return null;
	// walk to the `=` that is not part of `=>` or `==`, skipping the type annotation
	let i = m.index + m[0].length;
	let depth = 0;
	while (i < scope.length) {
		const c = scope[i];
		if (c === '{' || c === '[' || c === '(' || c === '<') depth += 1;
		else if (c === '}' || c === ']' || c === ')' || c === '>') depth -= 1;
		else if (c === '=' && depth <= 0 && scope[i + 1] !== '=' && scope[i + 1] !== '>') break;
		else if (c === ';' && depth <= 0) return null;
		i += 1;
	}
	if (i >= scope.length) return null;
	const rest = scope.slice(i + 1).trimStart();
	if (rest.startsWith('{')) {
		const close = matchBracket(rest, 0);
		return close === -1 ? rest : rest.slice(0, close + 1);
	}
	const semi = rest.indexOf(';');
	return semi === -1 ? rest : rest.slice(0, semi);
}

function literalKeys(literal, scope, types) {
	const keys = new Map();
	const close = matchBracket(literal, 0);
	if (close === -1) return keys;
	for (const entry of splitTopLevel(literal.slice(1, close))) {
		if (entry.startsWith('...')) {
			keys.set('...spread', { type: null, always: true, spread: true });
			continue;
		}
		const kv = entry.match(/^\[?['"]?([\w-]+)['"]?\]?\s*:\s*([\s\S]+)$/);
		if (kv) {
			keys.set(kv[1], { type: inferValueType(kv[2], types), always: true, via: 'literal' });
			continue;
		}
		const shorthand = entry.match(/^(\w+)$/);
		if (shorthand) {
			keys.set(shorthand[1], { type: types.idType.get(shorthand[1]) ?? null, always: true, via: 'shorthand' });
		}
	}
	return keys;
}

/** Normalise `/api/spaces/${spaceId}/teams/add` -> `/api/spaces/{}/teams/add`. */
function normalisePath(p) {
	let out = '';
	let i = 0;
	while (i < p.length) {
		if (p[i] === '$' && p[i + 1] === '{') {
			const close = matchBracket(p, i + 1);
			out += '{}';
			i = close === -1 ? p.length : close + 1;
			continue;
		}
		if (p[i] === '{') {
			const close = p.indexOf('}', i);
			out += '{}';
			i = close === -1 ? p.length : close + 1;
			continue;
		}
		out += p[i];
		i += 1;
	}
	return out;
}

/**
 * Extract every API request issued by one operation file.
 *
 * Note what is deliberately reported rather than skipped: a call whose `method` or `endpoint`
 * cannot be read is returned with `broken: true`. That is the falsification hook - rename the
 * `endpoint:` field in any operation file and this becomes a named extractor error instead of
 * a call that quietly vanishes from the totals.
 */
function extractRequests(filePath) {
	const raw = readFileSync(filePath, 'utf8');
	const src = stripComments(raw);

	// Scope the search to the executed body; the `description` array above it never calls the API.
	// `executeAll` is the once-per-execution shape (see `readRouterSurface`); without it here the
	// scope would silently fall back to the whole file.
	const execIdx = src.search(/export\s+(?:async\s+)?function\s+execute(?:All)?\b/);
	const scope = execIdx === -1 ? src : src.slice(execIdx);
	const types = buildTypeMap(scope);

	const requests = [];
	const callRe = new RegExp(`\\b(${Object.keys(REQUEST_HELPERS).join('|')})\\.call\\s*\\(`, 'g');
	let m;
	while ((m = callRe.exec(scope))) {
		const helper = m[1];
		const parenOpen = scope.indexOf('(', m.index + m[0].length - 1);
		const parenClose = matchBracket(scope, parenOpen);
		if (parenClose === -1) {
			requests.push({ helper, broken: true, reason: 'unbalanced argument list' });
			continue;
		}
		const args = scope.slice(parenOpen + 1, parenClose);
		const objOpen = args.indexOf('{');
		if (objOpen === -1) {
			requests.push({ helper, broken: true, reason: 'no options object literal in the call' });
			continue;
		}
		const objClose = matchBracket(args, objOpen);
		if (objClose === -1) {
			requests.push({ helper, broken: true, reason: 'unbalanced options object' });
			continue;
		}
		const optionsInner = args.slice(objOpen + 1, objClose);

		const props = new Map();
		for (const entry of splitTopLevel(optionsInner)) {
			if (entry.startsWith('...')) { props.set('...spread', entry); continue; }
			const kv = entry.match(/^(\w+)\s*:\s*([\s\S]+)$/);
			if (kv) props.set(kv[1], kv[2].trim());
			else {
				const sh = entry.match(/^(\w+)$/);
				if (sh) props.set(sh[1], sh[1]);
			}
		}

		const methodRaw = props.get('method');
		const endpointRaw = props.get('endpoint');

		if (!methodRaw || !endpointRaw) {
			requests.push({
				helper,
				broken: true,
				reason: !endpointRaw
					// The 2026-09-03 failure mode, named explicitly so it can never be silent again.
					? "no `endpoint:` property found in the request options (the field is `endpoint:`, not `url:` - if the source was renamed, this extractor must be updated)"
					: 'no `method:` property found in the request options',
				sawProps: [...props.keys()],
			});
			continue;
		}

		const method = methodRaw.replace(/^['"`]|['"`]$/g, '').toLowerCase();
		if (!HTTP_METHODS.includes(method)) {
			requests.push({ helper, broken: true, reason: `method is not a literal HTTP verb: ${methodRaw}` });
			continue;
		}

		const endpointLiteral = endpointRaw.replace(/^['"`]|['"`]$/g, '');
		const path = normalisePath(endpointLiteral);
		if (!path.startsWith('/')) {
			requests.push({ helper, broken: true, reason: `endpoint is not a literal path: ${endpointRaw.slice(0, 60)}` });
			continue;
		}

		const body = props.has('body') ? resolveFields(props.get('body'), scope, types) : null;
		const qs = props.has('qs') ? resolveFields(props.get('qs'), scope, types) : null;

		// `oneAiApiRequestAllItems` merges `page`/`pageSize` into `qs` itself. Without this the
		// shape tier would report two phantom "unknown query parameter" findings per list call.
		if (REQUEST_HELPERS[helper].kind === 'paginated') {
			const keys = qs?.keys ?? new Map();
			keys.set('page', { type: 'number', always: true, via: 'transport' });
			keys.set('pageSize', { type: 'number', always: true, via: 'transport' });
			if (!qs) { requests.push({ helper, method, path, endpointLiteral, body, qs: { keys, opaque: false, source: 'transport' } }); continue; }
		}

		requests.push({ helper, method, path, endpointLiteral, body, qs });
	}
	return requests;
}

// ---------------------------------------------------------------------------
// Input B: the spec
// ---------------------------------------------------------------------------

function loadSpec() {
	if (!existsSync(SPEC_FILE)) {
		fatal(
			`no spec snapshot at ${SPEC_FILE}\n` +
			'Generate it from a clean oneAI checkout with `npx tsx src/scripts/update-openapi.ts`\n' +
			'and record the commit it came from in openapi/PROVENANCE.md.',
		);
	}
	let spec;
	try {
		spec = JSON.parse(readFileSync(SPEC_FILE, 'utf8'));
	} catch (e) {
		fatal(`spec at ${SPEC_FILE} is not valid JSON: ${e.message}`);
	}
	if (!spec.paths || typeof spec.paths !== 'object') {
		fatal(`spec at ${SPEC_FILE} has no \`paths\` object - it is not an OpenAPI document`);
	}
	return spec;
}

function deref(spec, node, seen = 0) {
	if (!node || typeof node !== 'object' || seen > 20) return node;
	if (node.$ref) {
		const parts = node.$ref.replace(/^#\//, '').split('/');
		let cur = spec;
		for (const p of parts) cur = cur?.[p];
		return deref(spec, cur, seen + 1);
	}
	if (Array.isArray(node.allOf)) {
		const merged = { type: 'object', properties: {}, required: [], additionalProperties: node.additionalProperties };
		for (const part of node.allOf) {
			const d = deref(spec, part, seen + 1);
			Object.assign(merged.properties, d?.properties ?? {});
			merged.required.push(...(d?.required ?? []));
			if (d?.additionalProperties === false) merged.additionalProperties = false;
		}
		return merged;
	}
	return node;
}

function indexSpec(spec) {
	// normalised "METHOD path" -> { path, method, op }
	const index = new Map();
	let count = 0;
	for (const [p, item] of Object.entries(spec.paths)) {
		for (const [method, op] of Object.entries(item)) {
			if (!HTTP_METHODS.includes(method)) continue;
			count += 1;
			const key = `${method.toUpperCase()} ${normalisePath(p)}`;
			if (!index.has(key)) index.set(key, []);
			index.get(key).push({ path: p, method, op, pathItem: item });
		}
	}
	return { index, count };
}

function specRequestSchema(spec, entry) {
	const rb = deref(spec, entry.op.requestBody);
	if (!rb) return null;
	const content = rb.content ?? {};
	const json = content['application/json'] ?? content[Object.keys(content)[0]];
	if (!json) return null;
	return { required: rb.required === true, schema: deref(spec, json.schema) };
}

function specQueryParams(spec, entry) {
	const params = [...(entry.pathItem.parameters ?? []), ...(entry.op.parameters ?? [])]
		.map((p) => deref(spec, p))
		.filter((p) => p && p.in === 'query');
	return params;
}

// ---------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------

const typeCompatible = (ours, theirs) => {
	if (!ours || !theirs) return true; // unknown on either side: make no claim
	if (ours === theirs) return true;
	if (theirs === 'integer' && ours === 'number') return true;
	if (theirs === 'number' && ours === 'number') return true;
	// n8n `collection` values and anything we could not narrow arrive as object
	if (ours === 'object' && (theirs === 'object' || theirs === 'array')) return true;
	return false;
};

/**
 * Tier-3 self-accounting. "0 shape findings" is only good news if the shape tier actually looked
 * at something; the same sentence is also what a silently broken body reader prints. These
 * counters are surfaced in the report so a reader can tell the two apart at a glance.
 */
const shapeStats = {
	bodiesCompared: 0,      // we send a body, the spec defines one: fields really were diffed
	bodiesOpaque: 0,        // body is a Buffer or an expression we cannot read statically
	bodiesNoneNeeded: 0,    // neither side has a body, or the spec declares none
	querySetsCompared: 0,   // the spec declares query parameters and we compared against them
};

function compareShape(spec, entry, req) {
	const findings = [];
	const label = `${req.method.toUpperCase()} ${req.path}`;

	// --- request body -------------------------------------------------------
	const specBody = specRequestSchema(spec, entry);
	const ourBody = req.body;

	if (specBody?.schema?.type === 'object') {
		const props = specBody.schema.properties ?? {};
		const required = specBody.schema.required ?? [];
		const closed = specBody.schema.additionalProperties === false;

		if (ourBody && !ourBody.opaque) shapeStats.bodiesCompared += 1;
		else if (ourBody?.opaque) shapeStats.bodiesOpaque += 1;
		else shapeStats.bodiesNoneNeeded += 1;

		if (!ourBody) {
			if (required.length > 0) {
				findings.push({
					severity: 'FAIL', tier: 'shape', label,
					message: `sends no request body, but the schema requires ${required.map((r) => `\`${r}\``).join(', ')}`,
				});
			}
		} else if (ourBody.opaque) {
			findings.push({
				severity: 'INFO', tier: 'shape', label,
				message: `request body not statically readable (${ourBody.source}${ourBody.note ? `: ${ourBody.note}` : ''}) - shape not checked`,
			});
		} else {
			const hasSpread = ourBody.keys.has('...spread');
			for (const r of required) {
				const k = ourBody.keys.get(r);
				if (!k) {
					if (!hasSpread) {
						findings.push({
							severity: 'FAIL', tier: 'shape', label,
							message: `required body field \`${r}\` is never sent`,
						});
					}
				} else if (k.always === false) {
					findings.push({
						severity: 'FAIL', tier: 'shape', label,
						message: `required body field \`${r}\` is only sent conditionally`,
					});
				}
			}
			for (const [k, v] of ourBody.keys) {
				if (k === '...spread') continue;
				if (!(k in props)) {
					findings.push({
						severity: closed ? 'FAIL' : 'WARN', tier: 'shape', label,
						message: `sends body field \`${k}\`, which the schema does not define`
							+ (closed ? ' (body is `additionalProperties: false`, so this is rejected)' : ''),
					});
					continue;
				}
				const theirs = deref(spec, props[k]);
				if (!typeCompatible(v.type, theirs?.type)) {
					findings.push({
						severity: 'FAIL', tier: 'shape', label,
						message: `body field \`${k}\`: we send ${v.type}, schema expects ${theirs.type}`,
					});
				}
				if (theirs?.enum && v.type === 'string' && v.literal && !theirs.enum.includes(v.literal)) {
					findings.push({
						severity: 'FAIL', tier: 'shape', label,
						message: `body field \`${k}\`: we send '${v.literal}', not one of ${theirs.enum.join(', ')}`,
					});
				}
			}
		}
	} else if (!specBody) {
		shapeStats.bodiesNoneNeeded += 1;
	} else {
		// the spec declares a body that is not a JSON object schema - a raw binary upload.
		// There are no named fields to diff, so this is honestly "not checked", not "clean".
		shapeStats.bodiesOpaque += 1;
	}
	if (!specBody && ourBody && !ourBody.opaque && ourBody.keys.size > 0) {
		findings.push({
			severity: 'WARN', tier: 'shape', label,
			message: `sends a request body (${[...ourBody.keys.keys()].join(', ')}), but the spec declares none for this operation`,
		});
	}

	// --- query parameters ---------------------------------------------------
	const specQs = specQueryParams(spec, entry);
	const specQsByName = new Map(specQs.map((p) => [p.name, p]));
	const ourQs = req.qs;
	if (specQs.length > 0) shapeStats.querySetsCompared += 1;

	for (const p of specQs) {
		if (!p.required) continue;
		const k = ourQs?.keys.get(p.name);
		if (!k) {
			findings.push({
				severity: 'FAIL', tier: 'shape', label,
				message: `required query parameter \`${p.name}\` is never sent`,
			});
		} else if (k.always === false) {
			findings.push({
				severity: 'FAIL', tier: 'shape', label,
				message: `required query parameter \`${p.name}\` is only sent conditionally`,
			});
		}
	}
	if (ourQs && !ourQs.opaque) {
		for (const [k, v] of ourQs.keys) {
			if (k === '...spread') continue;
			const p = specQsByName.get(k);
			if (!p) {
				// Unknown query parameters are ignored by the server rather than rejected, so this
				// is a WARN: it means we send something that no longer does anything.
				findings.push({
					severity: 'WARN', tier: 'shape', label,
					message: `sends query parameter \`${k}\`, which the spec does not define (it will be ignored)`,
				});
				continue;
			}
			const theirs = deref(spec, p.schema);
			if (!typeCompatible(v.type, theirs?.type)) {
				findings.push({
					severity: 'FAIL', tier: 'shape', label,
					message: `query parameter \`${k}\`: we send ${v.type}, schema expects ${theirs.type}`,
				});
			}
		}
	}

	return findings;
}

/**
 * Make a tier-1 failure actionable by showing what the spec DOES offer in the same place.
 *
 * A similarity ranking was tried first and it is actively misleading here: candidates under a
 * shared prefix score identically, so the "closest match" is whichever one the spec happens to
 * list first. For `POST /api/spaces/{}/artifacts/export/{}` that surfaced `.../transfer`, while
 * the real successor - `GET /api/spaces/{}/artifacts/{}/pdf` - sat outside the top three purely
 * by insertion order. Scoring an arbitrary winner and calling it "closest" is the same class of
 * mistake this whole script exists to prevent, so instead: find the longest path prefix the spec
 * still knows, and list everything underneath it. That is a fact, and the reader can pick.
 */
function suggestPaths(specIndex, method, path, limit = 10) {
	const ourSegs = path.split('/').filter(Boolean);
	const allKeys = [...specIndex.keys()];

	for (let depth = ourSegs.length; depth >= 2; depth--) {
		const prefix = `/${ourSegs.slice(0, depth).join('/')}`;
		const under = allKeys.filter((k) => {
			const p = k.split(' ')[1];
			return p === prefix || p.startsWith(`${prefix}/`);
		});
		if (under.length > 0 && under.length <= limit) return { prefix, keys: under };
		if (under.length > limit) return { prefix, keys: under.slice(0, limit), truncated: under.length - limit };
	}
	return null;
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

function fatal(message) {
	if (AS_JSON) {
		process.stdout.write(JSON.stringify({ ok: false, extractorBroken: true, error: message }, null, 2) + '\n');
	} else {
		process.stderr.write(`\nEXTRACTOR BROKEN - refusing to report\n\n${message}\n\n`);
	}
	process.exit(2);
}

function main() {
	const spec = loadSpec();
	const { index: specIndex, count: specOpCount } = indexSpec(spec);
	const specPathCount = Object.keys(spec.paths).length;

	// ---- vacuity guard: the spec ------------------------------------------
	if (specPathCount < FLOORS.specPaths || specOpCount < FLOORS.specOperations) {
		fatal(
			`the spec snapshot yielded ${specPathCount} paths / ${specOpCount} operations, ` +
			`below the floor of ${FLOORS.specPaths}/${FLOORS.specOperations}.\n` +
			'Either openapi/openapi.json is truncated or the generator failed. Not reporting coverage.',
		);
	}

	const router = readRouterSurface();
	const modes = readModesRegistry();

	// ---- vacuity guard: the router ----------------------------------------
	if (router.resources.length < FLOORS.resources || router.operations.length < FLOORS.operations) {
		fatal(
			`parsed ${router.resources.length} resources / ${router.operations.length} operations out of ` +
			`nodes/OneAi/actions/router.ts, below the floor of ${FLOORS.resources}/${FLOORS.operations}.\n` +
			'The router is the authority on the shipped surface; if it parses to almost nothing, this\n' +
			'script is measuring nothing. Fix the extractor before trusting any coverage number.',
		);
	}

	// ---- reconcile the router against modes.ts ----------------------------
	const reconciliation = [];
	if (modes) {
		const routerKeys = new Set(router.operations.map((o) => `${o.resource}/${o.operation}`));
		const modesKeys = new Set(modes.operations.map((o) => `${o.resource}/${o.operation}`));
		for (const k of routerKeys) {
			if (!modesKeys.has(k)) {
				reconciliation.push({
					severity: 'FAIL', kind: 'registry', key: k,
					message: `dispatched by router.ts but absent from modes.ts - isOperationAllowed() runs first, so this arm is unreachable dead code`,
				});
			}
		}
		for (const k of modesKeys) {
			if (!routerKeys.has(k)) {
				reconciliation.push({
					severity: 'FAIL', kind: 'registry', key: k,
					message: `offered by modes.ts but not dispatched by router.ts - the UI offers it and the node throws "Unknown operation" at runtime`,
				});
			}
		}
		const routerRes = new Set(router.resources);
		const modesRes = new Set(modes.resources.map((r) => r.value));
		for (const r of routerRes) if (!modesRes.has(r)) reconciliation.push({ severity: 'FAIL', kind: 'registry', key: r, message: 'resource dispatched by router.ts but absent from modes.ts RESOURCES' });
		for (const r of modesRes) if (!routerRes.has(r)) reconciliation.push({ severity: 'FAIL', kind: 'registry', key: r, message: 'resource in modes.ts RESOURCES but not dispatched by router.ts' });
	}

	// ---- resolve every dispatched operation to its request ----------------
	const exportMapCache = new Map();
	const shipped = [];
	const extractorErrors = [];

	for (const op of router.operations) {
		const key = `${op.resource}/${op.operation}`;
		if (!op.dir) {
			extractorErrors.push(`${key}: router alias \`${op.alias}\` has no matching \`import * as ${op.alias} from './...'\``);
			continue;
		}
		if (!exportMapCache.has(op.dir)) exportMapCache.set(op.dir, readExportMap(op.dir));
		const file = exportMapCache.get(op.dir).get(op.exportName);
		if (!file) {
			extractorErrors.push(`${key}: export \`${op.exportName}\` not found in nodes/OneAi/actions/${op.dir}/index.ts`);
			continue;
		}
		const filePath = join(ACTIONS_DIR, op.dir, file);
		if (!existsSync(filePath)) {
			extractorErrors.push(`${key}: resolved to ${op.dir}/${file}, which does not exist`);
			continue;
		}
		const requests = extractRequests(filePath);
		if (requests.length === 0) {
			extractorErrors.push(`${key} (${op.dir}/${file}): no API request could be extracted - every shipped operation calls the API through a transport helper, so zero means the extractor stopped matching`);
			continue;
		}
		for (const r of requests) {
			if (r.broken) {
				extractorErrors.push(`${key} (${op.dir}/${file}): ${r.reason}${r.sawProps ? ` [saw properties: ${r.sawProps.join(', ')}]` : ''}`);
			}
		}
		shipped.push({ ...op, file: `${op.dir}/${file}`, requests });
	}

	// ---- vacuity guard: the extractor -------------------------------------
	// This is the guard that would have caught the `url:` vs `endpoint:` failure. Anything that
	// stops the request reader from matching lands here as a named error, never as a zero.
	if (extractorErrors.length > 0) {
		fatal(
			`${extractorErrors.length} operation(s) could not be read:\n\n` +
			extractorErrors.map((e) => `  - ${e}`).join('\n') +
			'\n\nThese are extraction failures, not drift. A missing endpoint here would otherwise be\n' +
			'silently dropped from the totals and the report would look clean.',
		);
	}

	const totalRequests = shipped.reduce((a, s) => a + s.requests.length, 0);
	if (totalRequests < FLOORS.requestsExtracted) {
		fatal(
			`extracted only ${totalRequests} API calls from ${shipped.length} dispatched operations, ` +
			`below the floor of ${FLOORS.requestsExtracted}.\nThe request extractor is not matching. Not reporting coverage.`,
		);
	}

	// ---- tier 1 + tier 3 ---------------------------------------------------
	const findings = [...reconciliation];
	const calledKeys = new Set();
	const clean = [];

	for (const s of shipped) {
		const opFindings = [];
		for (const req of s.requests) {
			const key = `${req.method.toUpperCase()} ${req.path}`;
			const entries = specIndex.get(key);
			if (!entries) {
				const s = suggestPaths(specIndex, req.method, req.path);
				const hint = s
					? `\n             the spec still serves under \`${s.prefix}\`:\n`
						+ s.keys.map((k) => `               ${k}`).join('\n')
						+ (s.truncated ? `\n               ... and ${s.truncated} more` : '')
					: '';
				opFindings.push({
					severity: 'FAIL', tier: 'path', label: key,
					message: `calls \`${req.endpointLiteral}\`, which the spec does not expose${hint}`,
					specNeighbours: s ? { prefix: s.prefix, operations: s.keys } : null,
				});
				continue;
			}
			calledKeys.add(key);
			opFindings.push(...compareShape(spec, entries[0], req));
		}
		if (opFindings.length === 0) clean.push(s);
		for (const f of opFindings) findings.push({ ...f, resource: s.resource, operation: s.operation, file: s.file });
	}

	// ---- tier 2: what oneAI exposes that we do not call --------------------
	const uncalled = [];
	for (const [key, entries] of specIndex) {
		if (calledKeys.has(key)) continue;
		const e = entries[0];
		uncalled.push({ key, path: e.path, method: e.method.toUpperCase(), tags: e.op.tags ?? ['(untagged)'], summary: e.op.summary ?? '' });
	}
	const byTag = new Map();
	for (const u of uncalled) {
		const tag = u.tags[0];
		if (!byTag.has(tag)) byTag.set(tag, []);
		byTag.get(tag).push(u);
	}

	// ---- parked operations: on disk, not dispatched ------------------------
	// Not part of the pass/fail verdict - they ship to nobody. Reported because the moment
	// somebody uncomments one, its drift becomes real, and because it is where `/api/keys` lives.
	const parked = [];
	const dispatchedFiles = new Set(shipped.map((s) => s.file));
	for (const dir of readdirSync(ACTIONS_DIR, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		for (const f of readdirSync(join(ACTIONS_DIR, dir.name))) {
			if (!f.endsWith('.operation.ts')) continue;
			const rel = `${dir.name}/${f}`;
			if (dispatchedFiles.has(rel)) continue;
			const requests = extractRequests(join(ACTIONS_DIR, dir.name, f)).filter((r) => !r.broken);
			const dead = [
				...new Set(
					requests
						.map((r) => `${r.method.toUpperCase()} ${r.path}`)
						.filter((key) => !specIndex.has(key)),
				),
			].map((key) => ({ key }));
			parked.push({ file: rel, calls: requests.length, dead });
		}
	}

	const fails = findings.filter((f) => f.severity === 'FAIL');
	const warns = findings.filter((f) => f.severity === 'WARN');
	const infos = findings.filter((f) => f.severity === 'INFO');

	const report = {
		ok: fails.length === 0,
		spec: {
			file: 'openapi/openapi.json',
			paths: specPathCount,
			operations: specOpCount,
			provenance: 'openapi/PROVENANCE.md',
		},
		node: {
			resources: router.resources.length,
			dispatchedOperations: shipped.length,
			apiCallsExtracted: totalRequests,
			registryReconciled: modes ? reconciliation.length === 0 : null,
		},
		coverage: { specOperationsCalled: calledKeys.size, specOperationsNotCalled: uncalled.length },
		shapeTier: { ...shapeStats },
		findings,
		uncalledByTag: Object.fromEntries([...byTag].map(([k, v]) => [k, v.map((u) => `${u.method} ${u.path}`)])),
		parked,
	};

	// Tier-3 vacuity guard. If nothing was matched at tier 1 there is nothing to shape-check,
	// but if paths matched and the body reader still compared zero bodies, the body reader has
	// stopped working and "no shape findings" would be a lie of omission.
	if (calledKeys.size > 0 && shapeStats.bodiesCompared === 0 && shapeStats.querySetsCompared === 0) {
		fatal(
			`${calledKeys.size} spec operations matched at the path tier, but the shape tier compared\n` +
			'0 request bodies and 0 query-parameter sets. The request-shape reader is not working;\n' +
			'reporting "no shape findings" here would be measurement failure, not a clean result.',
		);
	}

	if (AS_JSON) {
		process.stdout.write(JSON.stringify(report, null, 2) + '\n');
		process.exit(fails.length === 0 ? 0 : 1);
	}

	// ---- human report ------------------------------------------------------
	const L = (s = '') => process.stdout.write(s + '\n');
	L();
	L('oneAI n8n node - API drift check');
	L('='.repeat(72));
	L(`  spec        openapi/openapi.json - ${specPathCount} paths, ${specOpCount} operations`);
	L(`              (provenance: openapi/PROVENANCE.md)`);
	L(`  node        ${router.resources.length} resources, ${shipped.length} dispatched operations, ${totalRequests} API calls`);
	L(`  registry    router.ts vs modes.ts: ${modes ? (reconciliation.length === 0 ? 'agree' : `${reconciliation.length} disagreement(s)`) : 'modes.ts not present'}`);
	L();

	L('TIER 1 + 3 - paths and request shapes of what we ship');
	L('-'.repeat(72));
	if (findings.length === 0) {
		L('  no findings.');
	} else {
		const grouped = new Map();
		for (const f of findings) {
			const k = f.kind === 'registry' ? 'router.ts / modes.ts' : `${f.resource}.${f.operation}  (${f.file})`;
			if (!grouped.has(k)) grouped.set(k, []);
			grouped.get(k).push(f);
		}
		for (const [k, fs] of grouped) {
			L(`  ${k}`);
			// Two call sites in one operation can produce byte-identical findings (a list
			// operation issues the same request twice, paginated and not). Say it once.
			const seen = new Set();
			for (const f of fs) {
				const line = `    [${f.severity}] ${f.tier ? `${f.tier}: ` : ''}${f.key ? `${f.key} - ` : ''}${f.label ? `${f.label} - ` : ''}${f.message}`;
				if (seen.has(line)) continue;
				seen.add(line);
				L(line);
			}
			L();
		}
	}
	L(`  ${fails.length} FAIL, ${warns.length} WARN, ${infos.length} INFO across ${shipped.length} operations (${clean.length} clean)`);
	L();
	// Say what the shape tier actually examined. "0 shape findings" and "the body reader is
	// broken" print the same headline otherwise.
	L(`  shape tier examined: ${shapeStats.bodiesCompared} request bodies field-by-field, `
		+ `${shapeStats.querySetsCompared} query-parameter sets`);
	L(`                       ${shapeStats.bodiesOpaque} bodies NOT checked (binary/unreadable), `
		+ `${shapeStats.bodiesNoneNeeded} calls with no body on either side`
		+ ` [${shapeStats.bodiesCompared + shapeStats.bodiesOpaque + shapeStats.bodiesNoneNeeded} of ${totalRequests} calls accounted]`);
	L();

	L('TIER 2 - endpoints oneAI exposes that this node does not call');
	L('-'.repeat(72));
	L('  This is an input to a product decision, not a to-do list. The measure of this node is');
	L('  what a workflow author can compose with the rest of n8n, not how much of the API it');
	L('  mirrors. Nothing below is a defect, and none of it affects the exit code.');
	L();
	L(`  ${calledKeys.size} of ${specOpCount} spec operations are called; ${uncalled.length} are not, grouped by area:`);
	L();
	const tagRows = [...byTag].sort((a, b) => b[1].length - a[1].length);
	for (const [tag, list] of tagRows) {
		L(`    ${String(list.length).padStart(3)}  ${tag}`);
	}
	L();
	if (VERBOSE) {
		for (const [tag, list] of tagRows) {
			L(`  ${tag}`);
			for (const u of list) L(`    ${u.method.padEnd(6)} ${u.path}`);
			L();
		}
	} else {
		L('  (run with --verbose for the full list, or --json for the machine-readable form)');
		L();
	}

	const parkedDead = parked.filter((p) => p.dead.length > 0);
	L('PARKED - operation files present on disk but not dispatched');
	L('-'.repeat(72));
	L(`  ${parked.length} file(s) are not reachable from router.ts and ship to nobody. They are`);
	L('  excluded from the verdict above. Any file-counting measure of this node counts them.');
	if (parkedDead.length > 0) {
		L();
		L(`  ${parkedDead.length} of them already call endpoints that no longer exist, so they cannot`);
		L('  simply be uncommented:');
		L();
		for (const p of parkedDead) {
			for (const d of p.dead) L(`    ${p.file.padEnd(42)} ${d.key}`);
		}
	}
	L();

	L('='.repeat(72));
	L(fails.length === 0
		? 'RESULT: no path or shape failures on the shipped surface.'
		: `RESULT: ${fails.length} failure(s) on the shipped surface.`);
	L();
	process.exit(fails.length === 0 ? 0 : 1);
}

main();
