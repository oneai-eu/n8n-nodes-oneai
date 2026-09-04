# Wake-up prompt — paste this into the first Claude Code session in this repository

---

You are working in `/root/n8n-nodes-oneai`, the **OneAI community node for n8n** — a published,
certified npm package that other people install into their own n8n instances. This is your first
session here. Everything you need is already on disk and on `main`; nothing has to be reconstructed.

## Read these first, in this order

1. **`CLAUDE.md`** — the rules. It opens with a table of the ways this repository differs from the
   OneAI platform repository, because those are exactly the habits that go wrong here: `gh` **works**
   here, draft PRs are native, the gates are `n8n-node lint|build`, and the blast radius is the
   **public npm registry**.
2. **`.claude/agents/AGENTS.md`** — the six agents, the gated order, and the rules they share.
3. **`docs/DRIFT-2026-09-03.md`** — what is currently broken, measured.
4. **`docs/FINDING-2026-09-03-paireditem-shadowing.md`** — one defect, and the reason the whole
   substrate insists on asserting properties rather than tokens.
5. **`docs/N8N-DEV-FEEDBACK-oli-agent-guidance.md`** and its `ANALYSIS-…` companion — Oli is our n8n
   app developer; his rules outrank the public documentation.

`docs/RESEARCH-2026-09-03-n8n-node-development.md` is the evidence base — 98 KB, every claim classed
and sourced against pinned versions. Consult it; do not read it end to end unless you need to.

## What this node is for

**Not API coverage — composability.** OneAI exposes ~400 endpoints; a node that mirrors an API is
unusable in n8n. The question for any capability is *what workflow does this make possible that was
impossible before?* The node's worth is as a junction in a graph of hundreds of other n8n nodes.

Owner direction: **Chatting (very important)**, Spaces, **Datasets**, Audit Logs. No sign-in, sign-up
or OAuth — the node authenticates with an API key.

## Five things that will otherwise cost you a run

🔴 **1. Publishing is triggered by `gh release create`, not `npm publish`.** `.github/workflows/publish.yml`
fires on `release: [created]`. It authenticates by OIDC trusted publishing, so there is **no token to
revoke** — the only control is who may create a release. Never create one. The hooks refuse it, along
with tag pushes, pushes to `main` and `gh pr ready`.

🔴 **2. Count the *dispatched* surface, not files.** 29 `*.operation.ts` files are commented out of
`actions/router.ts`. They are on disk, no lint rule sees them, and every file-based count includes
them. Two earlier analyses were wrong this way. `scripts/drift-check.mjs` parses the router.

🔴 **3. Measure `origin/main`.** The local checkout has been four commits stale while npm `latest`
was two releases ahead. Two analyses reported the wrong thing because of it.

🔴 **4. Presence is not correctness.** `pairedItem` was set in *every* operation and named the
**wrong item** — the `map` callback shadowed the parameter identifying the input item, and every
check for the token was green on 65 broken files. It is fixed and pinned by
`scripts/paired-item-check.mjs`, and the rule outlives the defect: **write checks that assert the
property, not the token.**

🔴 **5. A renamed n8n parameter breaks saved workflows silently.** The node declares `version: 1` as a
plain number, so every release lands directly on `typeVersion: 1` in every existing workflow, and
`getParameterIssues` never validates option membership. Renaming an *operation* fails loudly;
renaming a *parameter* just quietly does something else. That is a **HALT**, not a judgement call.

## The tooling, and how to check it is alive

```bash
npm install
npm run lint                      # n8n-node lint
npm run build                     # n8n-node build
npx tsc --noEmit
node scripts/drift-check.mjs      # spec ↔ dispatched surface, on SHAPES not just paths
```

The drift check exits **1** when it finds real drift and **2** when its own extractor is broken —
treat a 2 as "every number below is fiction", never as a finding.

`npx @n8n/scan-community-package @oneai-eu/n8n-nodes-oneai` verifies the **published** package. It
takes a package name, not a path; it cannot gate local code; and 🔴 **it exits 0 even when it fails**,
so parse its output. `0.1.9` passed on 2026-09-03.

## Your first task

**Read `TODO.md` and the top of `SESSION-HISTORY.md`.** Between them they carry the current state:
what is deployed on the bench, what is open, what needs the owner's ruling, and what the last run
decided and why. `TODO.md`'s frontier block is the single fastest way to know where things stand.

Then ask the owner what this run is for. If they hand you a master prompt, it lives under
`docs/orchestration/<run>/` and is untracked working material.

**Do not start by re-deriving the state from the code.** The tools below print it, and the two
documents above explain it. Hand counts of this surface have been wrong three times.

## Where a run ends

🔴 **On the bench, not in a branch.** `https://n8n.oneai.de` is the test instance and exists so the
owner can open the node the next morning and use it. Deploy the build there, leave a working
credential and a demo workflow or two, and say in your summary what to click. A run that ends with
pull requests and nothing running has finished half the job — that mistake has already been made
once here. Production is `n8n.oneai.eu` and no run touches it.

## How the owner wants to be met in the morning

Two draft PRs, and a summary that says what was broken and is now fixed, what you decided and why,
what the live trace actually proved — and, separately and plainly, **what you did not reach**.

`NOT-REACHED` with a reason is a result. A leg quietly skipped becomes a claim nobody chose to make,
which is exactly how a live HTTP 500 survived a passing trace in the platform repository last week.

One last thing, learned the same week: when a measurement produces a dramatic number, suspect the
measurement first. A drift check that reported "0 % coverage" was searching for a field name that did
not exist; a sweep that found "67 files with duplicate imports" was matching the first line of every
multi-line import. Both looked like findings. Neither was.
