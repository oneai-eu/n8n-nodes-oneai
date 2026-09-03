#!/usr/bin/env node
/**
 * paired-item-check — does every emitted row name the INPUT ITEM it actually came from?
 *
 * Usage:
 *   node scripts/paired-item-check.mjs            human-readable report
 *   node scripts/paired-item-check.mjs --json     machine-readable report on stdout
 *   node scripts/paired-item-check.mjs --verbose  also list every site that is clean
 *
 * Exit code: 0 = every `pairedItem` names the input item. 1 = at least one does not.
 * 2 = the extractor is broken (see "Vacuity guards") and every number above it is fiction.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS, AND WHY IT RESOLVES SCOPES INSTEAD OF GREPPING
 * ---------------------------------------------------------------------------
 *
 * `pairedItem` is n8n's data-lineage mechanism: it says which input row an output row
 * descends from. Downstream it drives `$item()` expressions, the "linked items" panel and the
 * attribution of a failure to the row that caused it. A wrong `pairedItem` does not fail
 * loudly - it silently answers a different question, and points at input rows that may not
 * exist.
 *
 * On 2026-09-03 this node had `pairedItem` set in every single operation and pointing at the
 * wrong item, in 65 of 78 files:
 *
 *     export async function execute(this: IExecuteFunctions, index: number) {
 *         //                                                ^^^^^ the INPUT ITEM
 *         return this.helpers.returnJsonArray(rows).map((item, index) => ({
 *             //                                               ^^^^^ SHADOWS it
 *             ...item,
 *             pairedItem: { item: index },   // -> position in the RESPONSE
 *         }));
 *     }
 *
 * Input item 3 returning ten rows labelled them `{item: 0}` … `{item: 9}`: ten different
 * ancestors, most of which need not exist. The truthful labelling is ten times `{item: 3}`.
 *
 * 1. IT ASSERTS THE PROPERTY, NOT THE TOKEN.
 *    "`pairedItem` is set" is green on all 65 broken files. So is "`pairedItem: { item: index }`
 *    appears". The property that matters is *the identifier inside `pairedItem` resolves to the
 *    execute function's own item parameter, and not to a binding that shadows it* - which is a
 *    question about scopes, so this file resolves scopes. That is the entire reason it is 400
 *    lines instead of one `grep`.
 *
 * 2. THE VARIABLE IS NOT ALWAYS CALLED `index`, WHICH IS WHY A TOKEN CHECK IS NOT ENOUGH.
 *    `compliancePattern/list.operation.ts` carries the identical defect spelled
 *    `.map((item, i) => ({ pairedItem: { item: i } }))`. Every check written from the
 *    2026-09-03 finding - which recorded the three `{ item: i }` sites as *correct*, because
 *    it believed they were all in `router.ts` - is green on it. Two of those three are this
 *    defect wearing a different name. A scope resolver does not care what the binding is
 *    called.
 *
 * 3. IT HAS VACUITY GUARDS, AND THEY EXIT 2.
 *    A structural checker that stops matching reports "0 problems", which is indistinguishable
 *    from success and is how this repository has already been fooled twice. If the tree yields
 *    implausibly few operation files or `pairedItem` sites, or if any file's `execute` cannot
 *    be parsed, this exits 2 and says the extractor is broken rather than printing a clean
 *    table.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CHECKS
 * ---------------------------------------------------------------------------
 *
 * For every `nodes/OneAi/actions/<resource>/*.operation.ts` - dispatched or parked, because a
 * parked file is a live break the moment somebody uncomments it:
 *
 *   R1  `execute` takes an item-index parameter (the first parameter after the TypeScript
 *       `this` pseudo-parameter, typed `number`). Without one the function cannot name the
 *       input item at all.
 *   R2  the file emits at least one `pairedItem`. A row that carries no lineage is not
 *       "safe" - n8n falls back to guessing, and the guess is what R3 exists to stop.
 *   R3  every `pairedItem: { item: X }` site resolves X to that parameter - not to a
 *       `.map((item, index) => …)` callback parameter, not to a `const` of the same name, not
 *       to a numeric literal.
 *
 * `actions/router.ts` is checked under its own rule: its `pairedItem` must name the loop
 * variable that walks `this.getInputData()`. It is the one place in the tree that was right,
 * and nothing should be allowed to make it wrong.
 *
 * Dependency-free and plain ESM for the same reason as `drift-check.mjs`: this repository has
 * no committed lockfile and a fresh clone has no `node_modules`, and CI pins Node 22 where
 * type-stripping a `.ts` entry point is not dependable. A checker that quietly stops running
 * is worth less than no checker.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ACTIONS_DIR = join(ROOT, 'nodes', 'OneAi', 'actions');
const ROUTER_FILE = join(ACTIONS_DIR, 'router.ts');

/**
 * Vacuity guards. These are tripwires, not assertions: they are set well below the real
 * numbers so that a parser which has stopped matching trips them, while an honest change to
 * the tree does not. Legitimately dropping below one of them requires a conscious edit here.
 */
const FLOORS = {
	operationFiles: 40,
	pairedItemSites: 40,
	dispatchedFiles: 30,
};

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const VERBOSE = argv.includes('--verbose');

// ---------------------------------------------------------------------------
// Source scanning primitives - shared in spirit with drift-check.mjs
// ---------------------------------------------------------------------------

/**
 * Remove `//` and block comments while leaving string and template literals intact.
 *
 * Line breaks are preserved so that every offset this file reports can still be turned into a
 * line number that matches the file on disk.
 */
function stripComments(src) {
	let out = '';
	let i = 0;
	const n = src.length;
	let quote = null;
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
			continue;
		}

		if (c === '/' && next === '*') {
			i += 2;
			while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
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
 * Map every bracket in the source to its partner, in one pass, respecting strings and
 * template interpolation. Returns `{ open: Map(open -> close), close: Map(close -> open) }`.
 *
 * Both directions are needed: forward to find a function body, backward to find the parameter
 * list of an arrow function from its `=>`.
 */
function bracketMap(src) {
	const open = new Map();
	const close = new Map();
	const stack = [];
	let quote = null;
	let braceDepth = 0;
	const templateStack = [];

	for (let i = 0; i < src.length; i++) {
		const c = src[i];
		if (quote) {
			if (c === '\\') {
				i += 1;
				continue;
			}
			if (quote === '`' && c === '$' && src[i + 1] === '{') {
				templateStack.push(braceDepth);
				quote = null;
				i += 1;
				continue;
			}
			if (c === quote) quote = null;
			continue;
		}
		if (c === '}' && templateStack.length > 0 && braceDepth === templateStack[templateStack.length - 1]) {
			templateStack.pop();
			quote = '`';
			continue;
		}
		if (c === '{') braceDepth += 1;
		else if (c === '}') braceDepth -= 1;
		if (c === "'" || c === '"' || c === '`') {
			quote = c;
			continue;
		}
		if (c === '(' || c === '[' || c === '{') {
			stack.push(i);
			continue;
		}
		if (c === ')' || c === ']' || c === '}') {
			const from = stack.pop();
			if (from === undefined) continue;
			open.set(from, i);
			close.set(i, from);
		}
	}
	return { open, close, unbalanced: stack.length };
}

const IDENT_RE = /[A-Za-z_$][\w$]*/;

function lineOf(src, index) {
	let line = 1;
	for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') line += 1;
	return line;
}

function skipSpaceForward(src, i) {
	while (i < src.length && /\s/.test(src[i])) i += 1;
	return i;
}

function skipSpaceBackward(src, i) {
	while (i >= 0 && /\s/.test(src[i])) i -= 1;
	return i;
}

/**
 * Split a parameter list and return the binding names it introduces.
 *
 * TypeScript's `this: IExecuteFunctions` is a type annotation, not a runtime parameter, and is
 * dropped here - it is never the item index, and leaving it in would make "the first
 * parameter" mean the wrong thing.
 */
function parseParams(inner) {
	const params = [];
	let depth = 0;
	let buf = '';
	let quote = null;
	for (let i = 0; i < inner.length; i++) {
		const c = inner[i];
		if (quote) {
			buf += c;
			if (c === '\\') {
				buf += inner[i + 1] ?? '';
				i += 1;
				continue;
			}
			if (c === quote) quote = null;
			continue;
		}
		if (c === "'" || c === '"' || c === '`') {
			quote = c;
			buf += c;
			continue;
		}
		if (c === '(' || c === '[' || c === '{' || c === '<') depth += 1;
		else if (c === ')' || c === ']' || c === '}' || c === '>') depth -= 1;
		if (depth === 0 && c === ',') {
			params.push(buf);
			buf = '';
			continue;
		}
		buf += c;
	}
	if (buf.trim()) params.push(buf);

	return params
		.map((p) => p.trim())
		.filter(Boolean)
		.map((p) => {
			const name = (p.match(/^([A-Za-z_$][\w$]*)/) ?? [])[1] ?? null;
			const type = p.includes(':') ? p.slice(p.indexOf(':') + 1).replace(/=.*$/, '').trim() : null;
			return { name, type, text: p };
		})
		.filter((p) => p.name !== null && p.name !== 'this');
}

/**
 * Every lexical scope in the file that can introduce a binding, as
 * `{ start, end, kind, params, declared }`.
 *
 * Two constructs open one: a `function` (its body braces) and an arrow `=>` (its body, which
 * may be a block, a parenthesised expression, or a bare expression). The bare-expression case
 * is the one that matters most here, because `.map((item, index) => ({ … }))` is exactly that
 * shape, and it is where the defect lives.
 */
function collectScopes(src, brackets, problems) {
	const scopes = [];

	// function declarations and expressions
	const fnRe = /\bfunction\b\s*\*?\s*([A-Za-z_$][\w$]*)?\s*(?=\()/g;
	let m;
	while ((m = fnRe.exec(src)) !== null) {
		const parenOpen = src.indexOf('(', m.index + m[0].length - 1);
		const parenClose = brackets.open.get(parenOpen);
		if (parenClose === undefined) {
			problems.push(`unbalanced parameter list for \`function\` at offset ${m.index}`);
			continue;
		}
		const bodyOpen = src.indexOf('{', parenClose);
		const bodyClose = bodyOpen === -1 ? undefined : brackets.open.get(bodyOpen);
		if (bodyOpen === -1 || bodyClose === undefined) {
			problems.push(`could not find the body of \`function\` at offset ${m.index}`);
			continue;
		}
		scopes.push({
			start: bodyOpen,
			end: bodyClose,
			kind: 'function',
			name: m[1] ?? '(anonymous)',
			paramsStart: parenOpen,
			params: parseParams(src.slice(parenOpen + 1, parenClose)),
			declared: new Map(),
		});
	}

	// arrow functions
	for (let i = 0; i < src.length - 1; i++) {
		if (src[i] !== '=' || src[i + 1] !== '>') continue;
		// `>=` and `=>` are distinguishable by the preceding character; a `=` before `>` is not
		// an arrow either (`>>=` does not occur here, but be conservative).
		if (src[i - 1] === '=' || src[i - 1] === '!' || src[i - 1] === '<' || src[i - 1] === '>') continue;

		let j = skipSpaceBackward(src, i - 1);
		let params = [];
		let paramsStart = j;

		if (src[j] === ')') {
			const parenOpen = brackets.close.get(j);
			if (parenOpen === undefined) {
				problems.push(`unbalanced arrow parameter list at offset ${j}`);
				continue;
			}
			paramsStart = parenOpen;
			params = parseParams(src.slice(parenOpen + 1, j));
		} else if (IDENT_RE.test(src[j] ?? '')) {
			// single identifier parameter without parentheses, or a return-type annotation.
			let k = j;
			while (k >= 0 && /[\w$]/.test(src[k])) k -= 1;
			const ident = src.slice(k + 1, j + 1);
			const before = skipSpaceBackward(src, k);
			if (src[before] === ':') {
				// `(x): Foo => …` - the real parameter list is the paren group before the `:`.
				const annotatedClose = skipSpaceBackward(src, before - 1);
				const parenOpen = brackets.close.get(annotatedClose);
				if (parenOpen === undefined) {
					problems.push(`could not read the annotated arrow parameter list at offset ${i}`);
					continue;
				}
				paramsStart = parenOpen;
				params = parseParams(src.slice(parenOpen + 1, annotatedClose));
			} else {
				paramsStart = k + 1;
				params = [{ name: ident, type: null, text: ident }];
			}
		} else {
			problems.push(
				`unrecognised arrow function parameter list before offset ${i} (saw ${JSON.stringify(src.slice(Math.max(0, i - 20), i + 2))})`,
			);
			continue;
		}

		// The body: a block, a parenthesised expression, or a bare expression that runs to the
		// end of the innermost bracket enclosing the arrow.
		const bodyStart = skipSpaceForward(src, i + 2);
		let bodyEnd;
		if (src[bodyStart] === '{' || src[bodyStart] === '(') {
			bodyEnd = brackets.open.get(bodyStart);
			if (bodyEnd === undefined) {
				problems.push(`unbalanced arrow body at offset ${bodyStart}`);
				continue;
			}
		} else {
			bodyEnd = enclosingBracketEnd(brackets, i) ?? src.length;
		}

		scopes.push({
			start: bodyStart,
			end: bodyEnd,
			kind: 'arrow',
			name: '(arrow)',
			paramsStart,
			params,
			declared: new Map(),
		});
	}

	// `const` / `let` / `var` bindings, attributed to the innermost scope containing them
	const declRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
	while ((m = declRe.exec(src)) !== null) {
		const owner = innermostScopeAt(scopes, m.index);
		if (owner) owner.declared.set(m[1], m.index);
	}

	// `for (let i = …)` puts its binding in the loop body, which the rule above already covers
	// because the loop head sits inside the enclosing function scope.

	return scopes.sort((a, b) => a.start - b.start);
}

/** The closing offset of the innermost bracket pair that contains `pos`. */
function enclosingBracketEnd(brackets, pos) {
	let best;
	for (const [open, close] of brackets.open) {
		if (open < pos && close > pos) {
			if (best === undefined || open > best.open) best = { open, close };
		}
	}
	return best?.close;
}

function innermostScopeAt(scopes, pos) {
	let best = null;
	for (const s of scopes) {
		if (s.start <= pos && pos <= s.end) {
			if (best === null || s.start > best.start) best = s;
		}
	}
	return best;
}

/**
 * Resolve `name` as seen from `pos`: the innermost enclosing scope that binds it, and how.
 * Returns `null` when nothing in the file binds it (an import, a global, or a typo).
 *
 * A `const`/`let` declared earlier in the scope wins over a parameter of the same name. In
 * straight-line code that combination is a SyntaxError, so the case this actually models is a
 * declaration inside a nested BLOCK - `if (…) { const index = 0; … }` - which really does
 * shadow the parameter. Block scopes are not tracked separately (telling a block apart from an
 * object literal without a real parser is the classic trap), so this deliberately errs towards
 * reporting: any local redeclaration of the identifier that `pairedItem` names is worth a
 * human look, and there is no legitimate reason for one.
 */
function resolveBinding(scopes, name, pos) {
	const enclosing = scopes
		.filter((s) => s.start <= pos && pos <= s.end)
		.sort((a, b) => b.start - a.start);
	for (const s of enclosing) {
		const declaredAt = s.declared.get(name);
		if (declaredAt !== undefined && declaredAt < pos) {
			return { scope: s, how: 'declaration', at: declaredAt };
		}
		const param = s.params.find((p) => p.name === name);
		if (param) return { scope: s, how: 'parameter', param };
		if (declaredAt !== undefined) return { scope: s, how: 'declaration', at: declaredAt };
	}
	return null;
}

/** Every `pairedItem:` site in the file, with the text of its `item:` value. */
function findPairedItemSites(src, brackets, problems) {
	const sites = [];
	const re = /\bpairedItem\s*:/g;
	let m;
	while ((m = re.exec(src)) !== null) {
		const objOpen = skipSpaceForward(src, m.index + m[0].length);
		if (src[objOpen] !== '{') {
			problems.push(`\`pairedItem\` at offset ${m.index} is not followed by an object literal`);
			continue;
		}
		const objClose = brackets.open.get(objOpen);
		if (objClose === undefined) {
			problems.push(`unbalanced \`pairedItem\` object at offset ${objOpen}`);
			continue;
		}
		const inner = src.slice(objOpen + 1, objClose);
		const itemMatch = inner.match(/\bitem\s*:\s*([^,}]+)/);
		sites.push({
			at: m.index,
			value: itemMatch ? itemMatch[1].trim() : null,
			raw: src.slice(m.index, objClose + 1).replace(/\s+/g, ' '),
		});
	}
	return sites;
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

function listOperationFiles() {
	const files = [];
	for (const entry of readdirSync(ACTIONS_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const dir = join(ACTIONS_DIR, entry.name);
		for (const f of readdirSync(dir)) {
			if (f.endsWith('.operation.ts')) files.push(join(dir, f));
		}
	}
	return files.sort();
}

/**
 * Which operations `router.ts` actually dispatches, so the report can split shipped from
 * parked. Comments are stripped first - that is what makes the 30 commented-out arms
 * disappear, and it is the whole reason this reads the router rather than the directory.
 *
 * The router's import alias need not match the directory it points at: `misc/` is imported as
 * `auth`, so `auth.checkAuth` has to be translated back to `misc.checkAuth` before it can be
 * matched to a file.
 */
function dispatchedFiles() {
	const src = stripComments(readFileSync(ROUTER_FILE, 'utf8'));

	const aliases = new Map();
	const importRe = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+'\.\/([A-Za-z_$][\w$]*)'/g;
	let m;
	while ((m = importRe.exec(src)) !== null) aliases.set(m[1], m[2]);

	const called = new Set();
	const re = /\bawait\s+([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\.execute\.call\b/g;
	while ((m = re.exec(src)) !== null) {
		called.add(`${aliases.get(m[1]) ?? m[1]}.${m[2]}`);
	}
	return called;
}

/**
 * Map a `<resource>.<exportName>` pair from the router onto the file that exports it.
 *
 * The `index.ts` files use a two-step form - `import * as del from './delete.operation'`
 * followed by `export { create, del as delete, … }` - because `delete` is a reserved word.
 * An earlier version of this function looked for `export * as x from './y'`, matched nothing,
 * and labelled all 78 files "parked", which is a confident and entirely false statement of
 * exactly the kind this repository keeps being caught by. Hence the floor below.
 */
function exportTargets() {
	const map = new Map();
	for (const entry of readdirSync(ACTIONS_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const indexFile = join(ACTIONS_DIR, entry.name, 'index.ts');
		if (!existsSync(indexFile)) continue;
		const src = stripComments(readFileSync(indexFile, 'utf8'));

		// local binding -> operation file
		const locals = new Map();
		const importRe = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+'\.\/([^']+)'/g;
		let m;
		while ((m = importRe.exec(src)) !== null) {
			locals.set(m[1], join(ACTIONS_DIR, entry.name, `${m[2]}.ts`));
		}

		// exported name (what the router says) -> local binding
		const exportRe = /export\s*\{([^}]*)\}/g;
		while ((m = exportRe.exec(src)) !== null) {
			for (const spec of m[1].split(',')) {
				const parts = spec.trim().split(/\s+as\s+/);
				if (parts.length === 0 || !parts[0]) continue;
				const local = parts[0].trim();
				const exported = (parts[1] ?? parts[0]).trim();
				const file = locals.get(local);
				if (file) map.set(`${entry.name}.${exported}`, file);
			}
		}

		// `export * as x from './y'` is not used here today, but cost nothing to support
		const starRe = /export\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+'\.\/([^']+)'/g;
		while ((m = starRe.exec(src)) !== null) {
			map.set(`${entry.name}.${m[1]}`, join(ACTIONS_DIR, entry.name, `${m[2]}.ts`));
		}
	}
	return map;
}

function checkOperationFile(filePath, problems) {
	const rel = relative(ROOT, filePath);
	const raw = readFileSync(filePath, 'utf8');
	const src = stripComments(raw);
	const brackets = bracketMap(src);
	if (brackets.unbalanced !== 0) {
		problems.push(`${rel}: ${brackets.unbalanced} unbalanced bracket(s) - the parser cannot be trusted here`);
		return null;
	}

	const scopes = collectScopes(src, brackets, problems);

	const execMatch = src.match(/export\s+(?:async\s+)?function\s+execute\s*(?=\()/);
	if (!execMatch) {
		problems.push(`${rel}: no \`export async function execute(\` found`);
		return null;
	}
	const execScope = scopes.find((s) => s.kind === 'function' && s.name === 'execute');
	if (!execScope) {
		problems.push(`${rel}: \`execute\` was found but its scope could not be resolved`);
		return null;
	}

	const findings = [];
	const itemParam = execScope.params[0] ?? null;

	// R1 - execute must take an item-index parameter
	if (itemParam === null) {
		findings.push({
			rule: 'R1',
			line: lineOf(src, execScope.paramsStart),
			message:
				'`execute` takes no item-index parameter, so nothing in this file can name the input item. ' +
				'Add `index: number` after `this` and pass the router loop variable.',
		});
	} else if (itemParam.type !== null && itemParam.type !== 'number') {
		findings.push({
			rule: 'R1',
			line: lineOf(src, execScope.paramsStart),
			message: `\`execute\`'s first parameter after \`this\` is \`${itemParam.text}\`, which is not the item index (expected \`number\`)`,
		});
	}

	// R2 - the file must emit lineage at all
	const sites = findPairedItemSites(src, brackets, problems);
	if (sites.length === 0) {
		findings.push({
			rule: 'R2',
			line: lineOf(src, execScope.start),
			message: 'no `pairedItem` is emitted, so every returned row carries no lineage',
		});
	}

	// R3 - every site must name the execute function's own item parameter
	for (const site of sites) {
		const line = lineOf(src, site.at);
		if (site.value === null) {
			findings.push({ rule: 'R3', line, message: `\`${site.raw}\` has no \`item:\` key` });
			continue;
		}
		const identMatch = site.value.match(/^([A-Za-z_$][\w$]*)$/);
		if (!identMatch) {
			findings.push({
				rule: 'R3',
				line,
				message: `\`pairedItem\` names \`${site.value}\`, which is not a plain identifier, so it cannot be the input item parameter`,
			});
			continue;
		}
		const name = identMatch[1];
		if (itemParam === null) continue; // already reported by R1

		const binding = resolveBinding(scopes, name, site.at);
		if (binding === null) {
			findings.push({
				rule: 'R3',
				line,
				message: `\`pairedItem\` names \`${name}\`, which nothing in this file binds`,
			});
			continue;
		}
		if (binding.scope === execScope && binding.how === 'parameter' && binding.param.name === itemParam.name) {
			continue; // correct
		}
		const where =
			binding.how === 'parameter'
				? `a ${binding.scope.kind === 'arrow' ? 'callback' : 'function'} parameter introduced at line ${lineOf(src, binding.scope.paramsStart)}`
				: `a local declaration at line ${lineOf(src, binding.at)}`;
		findings.push({
			rule: 'R3',
			line,
			message:
				`\`pairedItem\` names \`${name}\`, which resolves to ${where}, not to \`execute\`'s item parameter \`${itemParam.name}\` ` +
				'- the row is labelled with its position in the RESPONSE, not the input item it came from',
		});
	}

	return { file: rel, findings, sites: sites.length };
}

/**
 * `router.ts` gets its own rule: its `pairedItem` must name the variable that walks
 * `this.getInputData()`. It is the one place that was already right on 2026-09-03 and the
 * contrast is what makes the sweep safe.
 */
function checkRouter(problems) {
	const rel = relative(ROOT, ROUTER_FILE);
	const src = stripComments(readFileSync(ROUTER_FILE, 'utf8'));
	const brackets = bracketMap(src);
	const scopes = collectScopes(src, brackets, problems);
	const findings = [];

	const loop = src.match(/for\s*\(\s*let\s+([A-Za-z_$][\w$]*)\s*=\s*0\s*;[^)]*\.length/);
	if (!loop) {
		problems.push(`${rel}: could not find the \`for\` loop over the input items`);
		return { file: rel, findings, sites: 0 };
	}
	const loopVar = loop[1];

	const sites = findPairedItemSites(src, brackets, problems);
	if (sites.length === 0) {
		findings.push({
			rule: 'R4',
			line: lineOf(src, loop.index),
			message: 'the router emits no `pairedItem`, so a failed item is returned with no lineage',
		});
	}
	for (const site of sites) {
		if (site.value !== loopVar) {
			findings.push({
				rule: 'R4',
				line: lineOf(src, site.at),
				message: `\`pairedItem\` names \`${site.value}\`, not the input-item loop variable \`${loopVar}\``,
			});
		}
	}
	return { file: rel, findings, sites: sites.length };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function main() {
	const problems = [];
	const files = listOperationFiles();
	const dispatched = dispatchedFiles();
	const targets = exportTargets();
	const dispatchedPaths = new Set();
	for (const key of dispatched) {
		const p = targets.get(key);
		if (p) dispatchedPaths.add(p);
	}

	const results = [];
	for (const f of files) {
		const r = checkOperationFile(f, problems);
		if (r) results.push({ ...r, dispatched: dispatchedPaths.has(f) });
	}
	results.push({ ...checkRouter(problems), dispatched: true });

	const totalSites = results.reduce((n, r) => n + r.sites, 0);

	// Vacuity guards - a checker that has stopped matching must never print a clean table.
	if (files.length < FLOORS.operationFiles) {
		problems.push(
			`found only ${files.length} \`*.operation.ts\` file(s) under ${relative(ROOT, ACTIONS_DIR)}, below the floor of ${FLOORS.operationFiles}`,
		);
	}
	if (totalSites < FLOORS.pairedItemSites) {
		problems.push(
			`found only ${totalSites} \`pairedItem\` site(s), below the floor of ${FLOORS.pairedItemSites}`,
		);
	}
	if (dispatchedPaths.size < FLOORS.dispatchedFiles) {
		problems.push(
			`resolved only ${dispatchedPaths.size} of the router's ${dispatched.size} dispatched operation(s) onto a file, ` +
				`below the floor of ${FLOORS.dispatchedFiles} - the dispatched/parked split below would be a fabrication`,
		);
	}

	const failing = results.filter((r) => r.findings.length > 0);
	const findingCount = failing.reduce((n, r) => n + r.findings.length, 0);

	if (AS_JSON) {
		process.stdout.write(
			JSON.stringify(
				{
					extractorProblems: problems,
					operationFiles: files.length,
					dispatchedFiles: dispatchedPaths.size,
					pairedItemSites: totalSites,
					filesWithFindings: failing.length,
					findings: findingCount,
					results,
				},
				null,
				2,
			) + '\n',
		);
	} else {
		console.log('');
		console.log('OneAI n8n node - pairedItem lineage check');
		console.log('='.repeat(72));
		console.log(
			`  scanned     ${files.length} operation file(s) (${dispatchedPaths.size} dispatched, ${files.length - dispatchedPaths.size} parked) + router.ts`,
		);
		console.log(`  sites       ${totalSites} \`pairedItem\` expression(s) resolved against their scopes`);
		console.log('');

		if (problems.length > 0) {
			console.log('EXTRACTOR BROKEN - every number above is fiction');
			console.log('-'.repeat(72));
			for (const p of problems) console.log(`  ${p}`);
			console.log('');
			process.exit(2);
		}

		if (failing.length === 0) {
			console.log('  every `pairedItem` names the input item its row came from.');
		} else {
			console.log('FINDINGS');
			console.log('-'.repeat(72));
			for (const r of failing) {
				console.log(`  ${r.file}${r.dispatched ? '' : '  (parked - ships to nobody today)'}`);
				for (const f of r.findings) console.log(`    [${f.rule}] line ${f.line}: ${f.message}`);
				console.log('');
			}
		}

		if (VERBOSE) {
			console.log('CLEAN');
			console.log('-'.repeat(72));
			for (const r of results.filter((x) => x.findings.length === 0)) {
				console.log(`  ${r.file} (${r.sites} site(s))`);
			}
			console.log('');
		}

		console.log('='.repeat(72));
		if (findingCount === 0) {
			console.log('RESULT: clean.');
		} else {
			console.log(`RESULT: ${findingCount} finding(s) in ${failing.length} file(s).`);
		}
		console.log('');
	}

	if (problems.length > 0) process.exit(2);
	process.exit(findingCount === 0 ? 0 : 1);
}

main();
