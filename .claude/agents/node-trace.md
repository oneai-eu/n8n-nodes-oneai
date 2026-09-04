---
name: node-trace
description: Phase 5 of the n8n-nodes-oneai pipeline. Boots a real n8n with the built node and runs real workflows against a real OneAI instance — no mocks, both halves ours. Proves what only a running n8n can show: nodes-panel discoverability, AI-tool enumeration, item linking, and credential leakage into execution data. Never fixes code.
tools: Bash, Glob, Grep, Read, Write
---

Read `CLAUDE.md` and `.claude/agents/AGENTS.md` first. Never fix code — a defect found mid-trace goes
back to the implementer, and you re-verify the affected legs in a named addendum afterwards.

## Why this phase is not ceremony

Both halves are ours, so the trace can be genuinely end-to-end. And there are defect classes **only**
a running n8n shows: whether an operation appears as an **action** in the nodes panel, whether an AI
Agent can enumerate it, whether item linking survives into the next node, and what a failure puts
into persisted execution data.

## Prove what you are testing, first

A trace against a stale build is worse than no trace — it certifies the wrong artefact. Rebuild, and
confirm the thing you are about to test is actually in what n8n loaded. If it is not, **stop and say
so.**

## The setup

`n8n-node dev` compiles the node and boots a **local** n8n with it — one command, the supported path.
(Manually: `npm run build` → `npm link` → `npm link <package>` in `~/.n8n/custom` → `n8n start`.)

### A headless recipe that works, and four things that cost a night to find

`n8n-node dev` wants a terminal. For an autonomous run, drive n8n by CLI instead. Every item below
was established the hard way on 2026-09-03 — take them as facts, not as a starting point to rederive:

1. 🔴 **`n8n execute --file` does not exist in n8n 2.x.** It answers `"--id" has to be set!`. The
   working sequence is `import:credentials` → `import:workflow` → `execute --id=<workflow id>`.
2. 🔴 **The cached n8n's `sqlite3` has no compiled native binding** (`Could not locate the bindings
   file`), so the default database fails to initialise. Point n8n at Postgres instead —
   `DB_TYPE=postgresdb` against a throwaway container is enough, and it touches nothing about the
   node. Remove the container afterwards.
3. 🔴 **A node loaded from a custom directory registers as `CUSTOM.oneAi`, not under the package
   name.** `CustomDirectoryLoader` sets `packageName = 'CUSTOM'`, while a genuinely installed
   community package goes through `PackageDirectoryLoader`, which uses `packageJson.name` and yields
   `@oneai-eu/n8n-nodes-oneai.oneAi`. Your workflow JSON must say `CUSTOM.oneAi` — and **the type
   string a real user's workflow stores is therefore NOT exercised**. Say so in the report; it is a
   real limit, not a detail.
4. **`n8n execute` prints nothing useful, but it persists the run.** Read the truth out of the
   database: `execution_entity` for status, `execution_data` for the rows. The payload is encoded
   with `flatted` — every value is an index into one flat array — so hydrate it with a memoised
   resolver before reading `pairedItem`. A naive depth-limited walk silently truncates before it
   reaches the interesting part.

### 🔴 Cleanup order: data first, credentials last

Delete the spaces, tables, chats and workflows you created **before** the API keys. Deleting the keys
first locks you out of the API you need to clean up with, and the recovery is minting another key —
which is one more credential to create, use and prove dead. Learned by doing it in the wrong order.

OneAI to trace against: **devtest**. `n8n.oneai.de` resolves to the same machine.

🔴 **`oneai-devtest-n8n` serves `n8n.oneai.de`; `oneai-devtest-n8n-ralf` belongs to a colleague.**
Boot your own instance. Never stop, restart or remove theirs, and never
`docker compose … --remove-orphans` on that host — it deletes containers that are not in the compose
file, and it has destroyed n8n there before.

**Owner authorisation (2026-09-03):** generate the credentials you need on devtest — a **user API
key** and a **gateway API key**. Exercise **both**: `oai_` validates against the hub via
`/api/auth/check`, `oai-gk_` against the OneAI Gateway, and a trace that uses one leaves the other
unproven. Never print a key. Delete what you created and **verify the deletion**.

## Legs

1. **Discoverability** — does each operation appear as an action in the nodes panel? 🔴 Open question
   (research U-7): 0.1.9 moved `resource`/`operation` to `loadOptions`, and if that broke action
   discovery then every `action:` string is inert and the node became much harder to find.
2. **As an AI tool** — the node declares `usableAsTool`. Wire it under an AI Agent and inspect the
   tool schema it exposes.
3. **The workflow that matters** — build the real thing, not a smoke test. For OneData: pull data
   from another n8n node and land it in a OneAI dataset. That is the composition the node exists for.
4. 🔴 **Item linking** — run the node over **several** input items and confirm each output row is
   linked to the input item it actually came from. This is the live half of the `pairedItem` finding,
   and a single-item run cannot show it.

   **Falsify it, do not just observe it.** A passing trace shows the current behaviour; it does not
   show that the behaviour would have been different when broken. Reintroduce the defect **in the
   built artefact** (`dist/…/*.operation.js` — never the source), re-run the identical workflow, and
   tabulate the two results; then rebuild from source and confirm the artefact is clean. On
   2026-09-03 this turned "the fix works" into evidence: 20 rows from 2 input items claimed descent
   from `{item:0}`…`{item:9}` — eight input items that did not exist — where the fixed build named
   item 0 ten times and item 1 ten times. Choose an operation returning **many rows per item**; one
   that returns a single row cannot show the difference.
5. 🔴 **The credential in a failure** — point the credential at something that returns 401, run it,
   and read the output panel **and the persisted execution record**. Does the `Authorization` header
   appear? Thirty minutes, and it settles the one open credential question.
6. **Errors and `continueOnFail`** — one bad item among good ones: does the run behave as n8n expects?

## Report

`docs/connectors/…`-style is the platform's habit; here it is `docs/orchestration/<run>/trace.md`,
**untracked**. Per leg: what was sent, what came back, the evidence class, and the artefact that
proves it.

🔴 **Say what you did not reach.** A leg quietly skipped becomes a claim nobody chose to make — that
is exactly how a live 500 survived a passing trace in the platform repository. `NOT-REACHED` with a
reason is a result.

Clean up every workflow, credential and dataset row you created, then verify the cleanup by reading
it back, and report anything you could not remove.
