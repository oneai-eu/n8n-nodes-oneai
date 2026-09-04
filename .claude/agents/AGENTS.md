# The n8n-nodes-oneai agent set

Six agents, a gated order, and the rules all of them share. Read `CLAUDE.md` first — it holds the
facts; this file holds the process.

🔴 **This is not the OneAI connector pipeline with the names changed.** Two things make it a
different machine, and copying across the difference is the failure mode to guard against:

- **The API is ours.** The connector pipeline's expensive half exists because a third party owns the
  contract: archive their docs, hash them, class every claim, escalate every guess. Here the contract
  is generated from our own code, so that whole apparatus collapses into one mechanical question —
  *does our surface still agree with the spec?* — which is a **script**, not a phase.
- **We are the client, not the platform.** `connector-security`'s axes — multi-tenancy scoping,
  confirmation bypass, SSRF from our egress — do not apply. The actors here are workflow authors and
  instance operators, and the assets are a credential in n8n's store and whatever we put into a
  workflow's output.

---

## Order

```
 0  drift-check + paired-item-check + panel-check  ── always first, and after every change
 1  node-architect           ── selection: what belongs in a workflow node ⏸ GATE
 2  node-implementer         ── one operation family per run
 3  node-validator  ┐
 4  node-security   ┘        ── in parallel
 5  node-trace               ── a real workflow, a real n8n, real OneAI
 6  node-docs                ── README, codex, the published surface
```

The **⏸ GATE** after the architect is the only mandatory stop. Selection is a product decision
(`CLAUDE.md`, "What belongs in the node") and an agent may propose it but never rule it.

`node-trace` is not optional here. Two of the most valuable open questions can only be answered by a
running n8n: whether our operations still appear as **actions** in the nodes panel after the 0.1.9
`loadOptions` change, and whether a passed-through axios error leaks the `Authorization` header into
the output panel.

---

## Rules every agent follows

**Evidence.** `DOC-LITERAL` (quoted, with source and version) · `INTERPRETED` (derived — may not
establish a requirement) · `LIVE-PROVEN` (you sent it and saw the answer) · `NOT-REACHED`. Saying
`NOT-REACHED` is a result. A leg silently skipped becomes a claim nobody chose to make.

**🔴 Measure the shipped surface, not the files.** 29 `*.operation.ts` are commented out of the
router. They are on disk, no lint rule sees them, and every file-based count includes them. The
router is the authority on what ships.

**🔴 Measure `origin/main`, not the local checkout.** It has been four commits behind and npm
`latest` two releases ahead. Both analyses that skipped this step reported the wrong thing.

**🔴 Assert properties, not tokens.** The house example: `pairedItem` is set in every operation and
names the wrong item, because the `map` callback shadows the `index` parameter. Every check for the
token is green on 65 broken files. Write the rule that fails.

**Falsify what you assert.** A test that has never been seen to fail is a decoration. Break the
thing it guards, count the reds, and report expected-versus-actual honestly — a shortfall explained
is worth more than a number rounded up.

**Authority order.** Oli and the owner → n8n's shipped `nodes-base` → n8n's docs → everything else.
Read `nodes-base`; **never vendor it** into this repository.

**Git.** GitHub, so `gh` works. Branch, commit in English, `gh pr create --draft`. **Never** push to
`main` and never `gh pr ready`.

🔴 **The publish trigger is `gh release create`, not `npm publish`.**
`.github/workflows/publish.yml` fires on `release: [created]` and runs
`npm publish --access public --provenance`. A bare tag does nothing; a *release* ships to npmjs.org,
at whatever version `package.json` carries at that commit. It authenticates by **OIDC trusted
publishing**, so there is no token to revoke — the control is who may create a release. The hooks
refuse release creation, tag pushes and `npm publish` alike. **No AI attribution anywhere.**

**Reports are working material.** Phase reports and orchestration prompts stay untracked. Product
documentation — README, the codex file, anything a maintainer needs — is committed.

---

## The agents

### `node-architect` — selection, and only selection

Thinks **as an n8n workflow author**, not as an API owner. The question for any endpoint is never
"is it missing" but *what workflow does this make possible that was impossible before?* Value is
composability with the other hundreds of n8n nodes.

Input: the drift report, the OpenAPI snapshot, `nodes-base` for shape precedent. Output: a proposed
operation set with a one-line justification each, the resources they group into, the parameter shapes,
and — explicitly — **what it proposes to leave out and why**. Ends at the ⏸ GATE.

Owner-given direction: **Chatting (very important)**, Spaces, Datasets, Audit Logs; **OneData is the
most important missing capability** and now ships as `dataset` / `datasetRow` — treat it as the
worked example of a good answer, not as an open item; no sign-in/OAuth surface at all.

### `node-implementer` — one operation family per run

Writes `*.operation.ts` + the router arm + the `modes.ts` entry, following the file next door rather
than inventing a shape. Types come from the generated spec types; `as any` is forbidden and `unknown`
is not the escape hatch either.

🔴 Two things it must do that are easy to skip: wire the operation into the **router** (an operation
file nobody dispatches is invisible), and get **`pairedItem` right** — name the input item, do not
shadow it.

After finishing, it re-runs the drift check **over the whole surface**, as Oli requires: request
bodies change, and the operation you did not touch is the one that broke.

### `node-validator` — the gates, and whether the claims are true

`npm run lint` · `npm run build` · `npx tsc --noEmit` · `node scripts/drift-check.mjs` ·
`node scripts/paired-item-check.mjs` · `node scripts/panel-check.mjs` ·
`npx @n8n/scan-community-package`.

🔴 Both checkers exit **2** when their own extractor is broken; that is never a finding, it means
every number they printed is fiction. And the scanner examines the **published** package, not the
working tree, so it can never gate a branch — parse its output for `✅`/`❌`, since its exit code is
0 even on failure.

Then the three-way check the connector pipeline does well: ratified selection ↔ implementer's claims
↔ live code. Judges test quality by the property-not-token standard, and re-runs the mutations
rather than believing the counts.

### `node-security` — a client, not a platform

Small and specific. The axes:

- **the credential**: read only through `httpRequestWithAuthentication`, never reconstructed, never in a parameter, never logged
- 🔴 **what reaches the workflow author when we throw**: does a passed-through axios error carry the `Authorization` header into the output panel or the persisted execution record? This is the one credential-exposure question in an otherwise clean picture, and it is **open**
- **what we put into workflow output**: a node's output is persisted and visible; provider error bodies land there
- **npm supply chain**: lifecycle scripts, dependencies added, what the published tarball contains

Not: multi-tenancy, confirmation gates, our own egress. Those are the platform's.

### `node-trace` — both halves are ours

🔴 **The run ends with the node deployed on `n8n.oneai.de`** — the bench exists so the owner can
open it the next morning and try the thing. Replace the installed community package there and
restart it; production is `n8n.oneai.eu` and the `-ralf` container is a colleague's. OneAI to trace
against is **devtest** on the same host.

On the bench, `docker restart` is allowed and is part of deploying; `stop`, `kill` and `rm` are not.
🔴 Never `--remove-orphans` on that host — it deletes containers that are not in the compose file
and has destroyed n8n there before. If you need an instance of your own instead, `n8n-node dev`
boots one; that path does not exercise the real node type, so say so.

**Owner authorisation (2026-09-03):** generate the credentials a trace needs on devtest — a **user
API key** and a **gateway API key**. Both, because they validate differently: `oai_` against the hub
via `/api/auth/check`, `oai-gk_` against the Gateway. Never print a key; delete what you made and
verify the deletion.

Prove the artefact first: a trace against a stale build is worse than no trace.

### `node-docs` — the published surface

README, `OneAi.node.json`, and the operation documentation a maintainer reads. This package is
public, so its README is part of the product. Draft PR bodies in English, no AI attribution.

🔴 Also **`TODO.md` and `SESSION-HISTORY.md`, every run** — both tracked. The history says what was
decided, what was overturned, what a trace proved and what was **not** reached; the TODO carries the
open loops with stable IDs. They are **data, not rules**: the substrate stays the owner's. Write
them at the end of the RUN, not the end of the phase.

---

## HALT

Stop and ask rather than proceed when:

- selection is unresolved — that is the owner's ruling, not an agent's
- a change would **rename an operation or a parameter** on `typeVersion: 1`. A renamed parameter fails **silently**; this is the one class where guessing is worst
- the drift check's vacuity guard fires — the extractor is broken, and any number it prints is fiction
- a trace cannot reach a real n8n or a real OneAI. Report `NOT-REACHED`; do not simulate
- an action would touch the registry, `main`, or a colleague's container
- 🔴 a change would alter `.github/workflows/publish.yml`, `package.json`'s `version`, or add a lockfile. Each of those changes **the publish path itself**, which only the owner rules — and note that the path today runs no tests, no drift check and no `@n8n/scan-community-package`, with `npm install` against **no committed lockfile**, so `dist/` is built from whatever resolved in that job
