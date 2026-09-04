#!/usr/bin/env node
/**
 * panel-check — can a workflow author FIND this node in n8n's nodes panel?
 *
 * Usage:
 *   node scripts/panel-check.mjs            human-readable report
 *   node scripts/panel-check.mjs --json     machine-readable report on stdout
 *
 * Exit code: 0 = discoverable. 1 = a rule failed. 2 = the extractor is broken and every
 * number it printed is fiction.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 *
 * A node nobody can find is worse than a node that does not exist: it ships, it passes every
 * gate, and the failure is invisible from inside the repository. That is not hypothetical here.
 *
 * **`0.1.9` shipped a node that could not be found by searching the nodes panel at all** - not
 * its operations, not the node itself - and nothing caught it. `lint`, `build`, `tsc`, the drift
 * check and the lineage check were all green, because none of them asks the question a user
 * asks. It was found only when the owner typed "oneai" into a real n8n and got nothing back.
 *
 * Two independent causes were established on a live instance, both by measurement:
 *
 * 1. 🔴 **n8n's node creator is ACTION-FIRST.** It builds a node's entries from the **static
 *    `options` arrays** of `resource` and `operation`, and from the `action` string on each
 *    operation. `0.1.9` moved both parameters to `loadOptions`, which is evaluated only after a
 *    node is already on the canvas - so the node produced **zero actions**. Measured: this node
 *    0 options / 0 actions, Slack 7 and 17 options / 7 actions, Perplexity 1 and 1 / 4.
 *
 * 2. 🔴 **"AI" in the MAIN node's codex `categories` removes it from the panel search.** That
 *    category routes a node into the AI branch of the creator, where `*Tool` variants live. The
 *    tool variant n8n generates from `usableAsTool: true` already carries `categories: ["AI"]`
 *    by itself - that is where an AI Agent looks. Removing "AI" from the main node is what
 *    finally made it appear.
 *
 *    Honest limit: cause 2 was decisive (the node appeared the moment it changed, with the
 *    actions fix already in place). Whether cause 1 alone would also have hidden it was never
 *    tested in isolation - "no actions AND no AI category" is an untried state. Both rules are
 *    enforced because both are independently right, not because both are proven necessary.
 *
 * Dependency-free, plain ESM, and reading SOURCE rather than a build - same reasoning as the
 * other two checkers: no committed lockfile, no `node_modules` in a fresh clone, CI on Node 22.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NODE_DIR = join(ROOT, 'nodes', 'OneAi');
const MODES_FILE = join(NODE_DIR, 'modes.ts');
const NODE_FILE = join(NODE_DIR, 'OneAi.node.ts');
const CODEX_FILE = join(NODE_DIR, 'OneAi.node.json');

/** Vacuity floors - a tripwire for "the extractor stopped matching", not an assertion. */
const FLOORS = {
	resources: 5,
	operations: 35,
};

const AS_JSON = process.argv.slice(2).includes('--json');

const problems = [];
const findings = [];

function read(file) {
	if (!existsSync(file)) {
		problems.push(`missing file: ${relative(ROOT, file)}`);
		return '';
	}
	return readFileSync(file, 'utf8');
}

// ---------------------------------------------------------------------------
// R1 - `resource` and `operation` must be STATIC options, never loadOptions
// ---------------------------------------------------------------------------

const nodeSrc = read(NODE_FILE);
const modesSrc = read(MODES_FILE);

for (const param of ['resource', 'operation']) {
	// A `loadOptionsMethod` anywhere near a `name: '<param>'` declaration is the defect.
	const re = new RegExp(`name:\\s*'${param}'[\\s\\S]{0,400}?loadOptionsMethod`);
	if (re.test(nodeSrc) || re.test(modesSrc)) {
		findings.push({
			rule: 'R1',
			message:
				`\`${param}\` is populated by \`loadOptions\`. n8n's node creator is action-first and reads ` +
				'STATIC `options` arrays; a node whose resource/operation come from loadOptions produces ' +
				'zero actions and is not surfaced by the nodes panel search at all. This shipped in 0.1.9.',
		});
	}
}

// ---------------------------------------------------------------------------
// R2 - every operation must carry an `action` string
// ---------------------------------------------------------------------------

const opEntries = [...modesSrc.matchAll(/\bvalue:\s*'([^']+)'[^}]*?\baction:\s*'([^']*)'/g)];
const opValues = [...modesSrc.matchAll(/\{\s*name:\s*'[^']+',\s*value:\s*'([^']+)'/g)];
const withoutAction = opEntries.filter(([, , action]) => action.trim() === '');
if (withoutAction.length > 0) {
	findings.push({
		rule: 'R2',
		message: `${withoutAction.length} operation(s) carry an empty \`action\`; the panel builds its entries from that string`,
	});
}

// ---------------------------------------------------------------------------
// R3 - the MAIN node's codex must not claim the "AI" category
// ---------------------------------------------------------------------------

let codex = null;
const codexRaw = read(CODEX_FILE);
try {
	codex = JSON.parse(codexRaw);
} catch (error) {
	problems.push(`${relative(ROOT, CODEX_FILE)} is not valid JSON: ${error.message}`);
}
if (codex) {
	const categories = Array.isArray(codex.categories) ? codex.categories : [];
	if (categories.length === 0) {
		problems.push(`${relative(ROOT, CODEX_FILE)} declares no categories - the extractor read nothing`);
	}
	if (categories.includes('AI')) {
		findings.push({
			rule: 'R3',
			message:
				'the codex lists "AI" among the MAIN node\'s categories. That routes it into the AI branch of ' +
				'the node creator and it disappears from the panel search. The tool variant n8n generates from ' +
				'`usableAsTool: true` already carries `categories: ["AI"]` on its own, which is where an AI ' +
				'Agent looks for it. Measured live: removing "AI" is what made the node findable again.',
		});
	}
}

// ---------------------------------------------------------------------------
// Vacuity guards
// ---------------------------------------------------------------------------

const resourceCount = (modesSrc.match(/gateway:\s*(true|false)\s*\}/g) ?? []).length;
const resourceBlock = modesSrc.match(/RESOURCES:\s*ResourceDefinition\[\]\s*=\s*\[([\s\S]*?)\n\];/);
const resources = resourceBlock ? (resourceBlock[1].match(/value:\s*'/g) ?? []).length : 0;

if (resources < FLOORS.resources) {
	problems.push(`read only ${resources} resource(s) from modes.ts, below the floor of ${FLOORS.resources}`);
}
if (opValues.length < FLOORS.operations) {
	problems.push(
		`read only ${opValues.length} operation value(s) from modes.ts, below the floor of ${FLOORS.operations}`,
	);
}
if (opEntries.length < FLOORS.operations) {
	problems.push(
		`read only ${opEntries.length} operation(s) carrying an \`action\`, below the floor of ${FLOORS.operations}`,
	);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (AS_JSON) {
	process.stdout.write(
		JSON.stringify({ extractorProblems: problems, resources, operations: opEntries.length, findings }, null, 2) +
			'\n',
	);
} else {
	console.log('');
	console.log('OneAI n8n node - nodes-panel discoverability check');
	console.log('='.repeat(72));
	console.log(`  read        ${resources} resource(s), ${opEntries.length} operation(s) with an action string`);
	console.log(`  codex       categories = ${codex ? JSON.stringify(codex.categories) : '(unreadable)'}`);
	console.log('');

	if (problems.length > 0) {
		console.log('EXTRACTOR BROKEN - every number above is fiction');
		console.log('-'.repeat(72));
		for (const p of problems) console.log(`  ${p}`);
		console.log('');
		process.exit(2);
	}

	if (findings.length === 0) {
		console.log('  the node is discoverable: static options, actions on every operation,');
		console.log('  and no "AI" category on the main node.');
	} else {
		console.log('FINDINGS');
		console.log('-'.repeat(72));
		for (const f of findings) console.log(`  [${f.rule}] ${f.message}\n`);
	}
	console.log('='.repeat(72));
	console.log(findings.length === 0 ? 'RESULT: clean.' : `RESULT: ${findings.length} finding(s).`);
	console.log('');
}

if (problems.length > 0) process.exit(2);
process.exit(findings.length === 0 ? 0 : 1);
