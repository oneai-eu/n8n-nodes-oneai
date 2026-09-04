# n8n-nodes-oneai — TODO

> **Living document.** Maintained by the `node-docs` agent at the end of every run.
> Closed items are pruned to a single ✅ line linking to `SESSION-HISTORY.md`; anything they left
> open is carried forward explicitly, so pruning never loses a loop.
>
> **IDs are stable.** `OWNER-` needs the owner's ruling, `BL-` is backlog, `BF-` is a defect found
> out of scope by an agent. Never renumber; close in place.
>
> This file is **data, not rules.** The rules live in `CLAUDE.md` and `.claude/agents/AGENTS.md`,
> which are the owner's. Nothing here overrides them.

**Frontier (2026-09-04):** published `0.1.9`; two draft PRs open and unmerged —
**#2** (API drift + `pairedItem` repair, → `main`) and **#3** (OneData datasets, → #2, stacked).
Nothing released. All gates green on #3: drift 0 over 57 dispatched operations, lineage 0 over 99
sites, lint/build/tsc clean. See `SESSION-HISTORY.md` § Session 0001.

---

## ▶ Needs the owner — blocking nothing, but nobody else can rule

- **OWNER-1 · Merge order for #2 and #3.** #3 is stacked on #2 and carries the documentation for
  **both**. 🔴 Do not cut a release from #2 alone: its README still lists the `Project > Create` and
  `Project > Delete` operations that same PR removes. Either take both, or ask for the documentation
  commit to be split.
- **OWNER-2 · `main` has no branch protection and no rulesets, and five collaborators hold
  admin + push.** Publishing is triggered by *creating a GitHub release*, authenticated by OIDC
  trusted publishing — so there is **no token to revoke** and the entire control surface is who may
  create a release. A compromise of any one of the five accounts ships to npm with a valid
  provenance attestation, which is the trust signal. Also: no `environment:` gate on the publish job.
- **OWNER-3 · Move to `VersionedNodeType`.** `version: 1` is a plain number, so every release lands
  directly on `typeVersion: 1` in every saved workflow, and `getParameterIssues` never validates
  option membership — a renamed *parameter* or a changed option *value* silently does something
  else. HTTP Request ships `1, 2, 3, 4, 4.1 … 4.5` with `4`–`4.5` sharing one class. This is what
  makes a breaking change affordable instead of forbidden, and #2 spent its one free pass (every
  parameter it renamed belonged to an operation that could not succeed).
- **OWNER-4 · The 29 parked operation files.** Five (`apiKey/*`) call `/api/keys`, now
  `/api/user-keys`. They ship to nobody, every file-counting measure counts them, and they have been
  dead through at least two releases. Recommendation: **delete them** — git history keeps them.
- **OWNER-5 · The publish path is not reproducible.** No committed lockfile, CI runs `npm install`,
  `npm install -g npm@latest`, floating `actions/*@v4`, and `@n8n/node-cli ^0.39.3` — which is the
  thing that *builds* `dist/`. `prepublishOnly` (`build && lint`) is the only gate that runs: no
  tests, no drift check, no scanner. Changing this is itself a release-affecting act.

## ▶ Open work

- **BL-1 · A response tier for `drift-check`.** It compares requests only. Two real defects lived in
  the response side (`artifact:exportPdf`, `space:downloadFile`) and no tier could see either. The
  by-hand sweep that found them — compare each call's declared `200` content type against its
  transport helper — is the shape of the check. *(P2)*
- **BL-2 · Trace the six untraced dataset operations** — `updateSchema`, `importCsv`, `exportCsv`,
  `update`, `delete`, and the `defineBelow`/`json` data modes — plus `continueOnFail` on both the
  item loop and the `appendMany` arm. *(P2)*
- **BL-3 · The nodes panel is unproven.** Whether the operations appear as *actions* after the
  0.1.9 `loadOptions` move needs a browser against a running n8n. Ten new operations make the answer
  more consequential, not less. *(P2)*
- **BL-4 · Generate types from `openapi/openapi.json`,** the way the platform generates
  `src/openapi.gen.ts`. Until then "follow the spec's types" is a habit a reviewer must police
  rather than something the compiler enforces. *(P2)*
- **BL-5 · A dataset trigger.** Named by the architect as the highest-value follow-up, and blocked:
  the API gives a poller no cursor. Needs an API-side change. *(P3)*
- **BL-6 · `project:archive` and `project:instantiateTemplate`,** to restore honestly what
  `project:create` / `project:delete` used to do before those endpoints were removed. *(P3)*
- **BL-7 · `artifact:exportPptx`** — a ~40-line mirror of the repaired `exportPdf`. *(P3)*
- **BL-8 · Percent-encode path segments in the pre-existing operations.** Done for the ten new ones;
  **39 interpolations across 36 older operation files** still go in raw (measured 2026-09-04).
  Not privilege escalation — an upstream expression can only redirect within the author's own
  authority — but it is inconsistent. *(P3)*
- **BL-9 · Gateway-plan behaviour is unproven.** Both key classes were exercised, but the `oai-gk_`
  key was minted against a `team`-plan org, so prefix routing is proven and `plan-gate` behaviour is
  not. Needs a genuine Gateway-plan org on devtest. *(P3)*

## ▶ For the OneAI API owners — not ours to fix

- **BF-1 · `GET /api/spaces/{spaceId}/files/download` returns HTTP 500 for a missing file**, not
  404, with `{"status":500,"errorMessage":"Internal Server Error."}`. A missing file is a client
  error, and a 500 reads as an outage to anyone monitoring it.
- **BF-2 · No endpoint deletes a data table.** Every other part of the dataset lifecycle exists.
  A workflow can create tables it can never remove.
- **BF-3 · `modes.ts` describes `artifact:create` as "Create an artifact from a file",** but the
  operation takes a space, a name and an optional source chat/message — there is no file anywhere in
  it. Display text only, so safe to change on `typeVersion: 1`.

## ▶ Closed

- ✅ **`pairedItem` named the wrong item in 65 of 78 files** — fixed and pinned by
  `scripts/paired-item-check.mjs`; defect and fix both observed in a running n8n.
  Session 0001, PR #2.
- ✅ **13 drift failures + 2 warnings** across `chat`, `space`, `project` and `artifact` — 0.
  Session 0001, PR #2.
- ✅ **OneData datasets** — ten operations across `dataset` and `datasetRow`. Session 0001, PR #3.
  *Carried forward:* BL-2, BL-3, BL-5.
- ✅ **`dist/tsconfig.tsbuildinfo` shipped to npm** — and the first fix for it made the build emit
  no JavaScript at all while reporting success. `incremental` is now off and must stay off.
  Session 0001, PR #2.
- ✅ **Provider values that the API never accepted** in `space:create` and `space:list` — corrected,
  with legacy values translated at execute time so saved workflows start working. Session 0001, PR #2.
- ✅ **README promised three features the node does not have** — streaming, tool/function calling,
  Temperature. Session 0001, PR #3.
- ✅ **`CLAUDE.md` counts and status claims had gone stale** — measurements replaced by the commands
  that produce them. Session 0001, PR #3.
