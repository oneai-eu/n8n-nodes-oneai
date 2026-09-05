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

**Frontier (2026-09-04, evening): `0.2.0` is prepared and unreleased.** `package.json` says
`0.2.0`; npm `latest` is still `0.1.9`. The node ships **62 operations across 10 resources**
(`0.1.9` shipped 49 across 8), measured by `node scripts/drift-check.mjs`, which parses the router
and is the authority. All gates green on the release candidate: drift 0 findings over 62 operations
and 76 API calls, lineage 0 over 104 sites, panel 0, lint 0, `tsc` 0, cold and warm builds emit 118
`.js`. The README, the codex file and this file describe that surface and nothing else.
See `SESSION-HISTORY.md` § Session 0002.

🔴 **Only the owner releases.** Publishing is `gh release create` — not a tag, not `npm publish` —
and it ships whatever `package.json` says at the tagged commit, over OIDC trusted publishing with no
token to revoke. `0.1.9` is already on npm, so a release cut before `0.2.0` landed would have failed
the publish job rather than overwritten anything. Merge order is still **OWNER-1**.

🟢 **Deployed on the bench:** `https://n8n.oneai.de` (n8n **2.37.9**) runs the pre-release build as
the community package `@oneai-eu/n8n-nodes-oneai`. n8n's `installed_packages` row — what the
**Community nodes** page shows — reads **`0.1.9-pr3`**, so it cannot be mistaken for the npm
release. 🔴 The package's own `package.json` **on disk** still reads `0.1.9`: anyone who inspects the
container instead of the UI will conclude the published release is installed. The deployed build is
`d636473` minus one reworded resource description, verified by hashing `dist/nodes/OneAi/modes.js`
against a local build; it does **not** include this session's documentation-pass changes (the
`artifact:create` description, README, TODO, history), none of which alter behaviour.

Credential *oneAI devtest (bench, 2026-09-04)* and three demo workflows (`oneAI · 1/2/3`) are in the
owner's personal project; the demo data is the oneData space **n8n Demo Data**, table `contacts`
(5 rows landed by a real run, `age` a number). The owner opened and ran the demo workflows in the UI
on 2026-09-04 and they completed without error.

**Rollback / re-deploy.** Prefer **Settings → Community nodes**: uninstall the package, then install
`@oneai-eu/n8n-nodes-oneai`, which pulls the published version and rewrites the `installed_packages`
row at the same time. The shell equivalent, inside `oneai-devtest-n8n`, is
`cd /home/node/.n8n/nodes && rm -rf node_modules/@oneai-eu/n8n-nodes-oneai && npm install @oneai-eu/n8n-nodes-oneai@0.1.9`
followed by `docker restart oneai-devtest-n8n` **on the host**. 🔴 The `rm -rf` is not optional: the
installed tree already claims `0.1.9`, so a plain `npm install …@0.1.9` is satisfied by what is there
and silently does nothing. `docker restart` is the only container verb allowed on that host, and
`oneai-devtest-n8n-ralf` is a colleague's.

---

## ▶ Needs the owner — blocking nothing, but nobody else can rule

- **OWNER-2 · `main` has no branch protection and no rulesets, and five collaborators hold
  admin + push.** Publishing is triggered by *creating a GitHub release*, authenticated by OIDC
  trusted publishing — so there is **no token to revoke** and the entire control surface is who may
  create a release. A compromise of any one of the five accounts ships to npm with a valid
  provenance attestation, which is the trust signal. Also: no `environment:` gate on the publish job.
- **OWNER-9 · CLOSED — v0.3.0 scope ruled by the owner, 2026-09-04.** **Block 1 + Block 3 only.**
  Agent Builder (`api/agent-definitions`) is **deferred: the feature is not finished in oneAI yet**,
  and shipping against it would have been premature. 🔴 Second reason, which makes the ruling the
  safer one either way: a `typeVersion: 1` operation must stay in the `nodeVersions` map for the
  life of the package, so `agent:list` would have **frozen the resource name `agent` and its
  operation names against an API still in motion** — and a later rename of a parameter breaks
  workflows *silently*. Deferred to BL-22.

- **OWNER-7 · Does v0.3.0 trade away the package's zero-dependency property?** An
  `oneAI Chat Model` sub-node (~150 lines) would make **every AI Agent, LLM Chain and Information
  Extractor in n8n** run on oneAI — nothing else proposed comes close in reach.
  `POST /api/openai/v1/responses` exists and accepts `tools`/`tool_choice`/`stream`, so LangChain's
  `ChatOpenAIResponses` targets it on paper. Cost: **the first runtime dependencies in a
  zero-dependency package**, which is currently the property that makes the non-reproducible publish
  path (BL-18) tolerable. Recommendation: settle feasibility with a spike — one live tool-calling
  round trip — before the trade is even on the table. 🔴 Note `additionalProperties: false` and
  `previous_response_id` absent: the model must send full history every turn.
- **OWNER-8 · Ship the approval verdicts as AI-callable, or hold them back?**
  🔴 `usableAsTool` **cannot hide an operation from the tool variant** —
  `UsableAsToolDescription.replacements` is `Partial<Omit<INodeTypeBaseDescription,'usableAsTool'>>`
  and `INodeTypeBaseDescription` has no `properties` field. So `agent:confirm` and
  `auditLog:review` would be reachable by an LLM in one hop. **Narrowed by the owner's ruling of
  2026-09-04:** Agent Builder is out of v0.3.0, so this now concerns **`auditLog:review` alone**. Precedent, measured: n8n's own
  `SlackV2` is `usableAsTool: true` and exposes `archive`, `kick` and `delete`. Recommendation: ship
  with explicit naming and a README warning — but it is the owner's call, because oneAI is a
  compliance platform and an approval verdict is a different class of act. (Same finding is why
  `PUT /api/compliance/llm` is rejected outright.)
- ✅ **OWNER-6 · CLOSED — the node is findable again**, by static `resource`/`operation` options
  generated from `modes.ts`, each carrying an `action`. Session 0001, PR #2. *Carried forward:* a
  static list cannot be filtered by the credential, so a Gateway-only credential sees hub operations
  in the dropdown and `isOperationAllowed` refuses them at runtime — that trade is still the owner's
  to revisit; and n8n's injected "Custom API Call" entry is refused rather than implemented (BL-10).

## ▶ Open work

- **BL-18 · Install scripts still run in the publish job.** Five of the locked packages execute at
  install time (`cpu-features`, `isolated-vm`, `ssh2`, `unrs-resolver`, and
  `eslint-plugin-n8n-nodes-base`, whose `preinstall` fetches from the registry), and `dist/` is
  built in that same job. `--ignore-scripts` would break the native builds that lint depends on, so
  the real fix is to build the artefact somewhere the devDependencies are not installed. *(P2)*
- **BL-1 · A response tier for `drift-check`.** It compares requests only. Two real defects lived in
  the response side (`artifact:exportPdf`, `space:downloadFile`) and no tier could see either. The
  by-hand sweep that found them — compare each call's declared `200` content type against its
  transport helper — is the shape of the check. A spot check of all five binary operations passed at
  `0.2.0`, by hand again. *(P2)*
- **BL-2 · Trace the six untraced dataset operations** — `updateSchema`, `importCsv`, `exportCsv`,
  `update`, `delete`, and the `defineBelow`/`json` data modes — plus `continueOnFail` on both the
  item loop and the `appendMany` arm. *(P2)*
- **BL-4 · Generate types from `openapi/openapi.json`,** the way the platform generates
  `src/openapi.gen.ts`. Until then "follow the spec's types" is a habit a reviewer must police
  rather than something the compiler enforces. *(P2)*
- **BL-5 · A trigger node — and the reason it cannot be a webhook trigger.** Named by an earlier
  architect run as the highest-value follow-up for datasets, and blocked there because the API gives
  a poller no cursor. The 2026-09-04 pre-analysis generalises that finding across the whole API:
  🔴 **all 11 `api/webhooks` endpoints are receivers** — every `summary` begins with "Receive", the
  OpenAPI 3.1 top-level `webhooks` object is absent, and **0 of 401 operations carry a `callbacks`
  object**. No endpoint registers a URL for oneAI to call, so n8n's `webhookMethods` shape has
  nothing to attach to. A **polling** trigger stays possible; `GET /api/audit/logs` is the only
  pollable event with a server-side cursor, and its `since` is *"clamped to the plan's retention
  window"*, so a long-stopped workflow loses events rather than catching up. Prerequisite either
  way: BL-20. See `docs/ANALYSIS-2026-09-04-v0.3.0-candidates.md`. *(P3)*
- **BL-20 · `panel-check.mjs` cannot see a second node file.** It hard-codes `OneAi.node.ts` and
  `OneAi.node.json` (lines 54-55), so a trigger node or a chat-model sub-node would be **invisible
  to the checker whose entire purpose is keeping this node findable**. Walk `package.json`'s
  `n8n.nodes` array instead. This comes **before** any second node, not after. *(P2)*
- **BL-21 · Two loops shipped in `0.2.0` are half open.** `space:uploadFile`, `space:embedFiles` and
  `space:sync` have **no completion signal** — `GET …/files/stats` is not shipped, so "upload, then
  chat against it" is a race the author can only lose by guessing a Wait duration. And
  `ai:createResponse` can generate an image blob that **no shipped operation can fetch**;
  `chat:get` is the discovery path (`blobId` appears twice there and 0 times in the
  `/api/chats/{chatId}/http` response). A user meets both as bugs, not as missing features. First
  candidate block for v0.3.0. *(P2)*

- **BL-22 · Agent Builder (`api/agent-definitions`), deferred from v0.3.0.** 16 endpoints; ~7 were
  proposed (`list`, `get`, `run`, `getRun`, `listRuns`, `listPending`, `confirm`). Deferred by the
  owner because the feature is not finished in oneAI. **Revisit when the platform side settles** —
  and re-take the spec snapshot first, because the shapes are expected to move. Known constraint to
  carry forward: `POST …/runs` has body `{}` with `additionalProperties: false`, so **a run cannot
  be parameterised**. Consequence left standing meanwhile: `chat:create` / `chat:update` ship an
  `agentId` parameter with **no operation that yields an ID** — handled for now by saying in the
  parameter description where to find one, not by shipping a premature operation. *(P2)*

- **BL-9 · Gateway-plan behaviour is unproven.** Both key classes were exercised, but the `oai-gk_`
  key was minted against a `team`-plan org, so prefix routing is proven and `plan-gate` behaviour is
  not. Needs a genuine Gateway-plan org on devtest. *(P3)*
- **BL-10 · Implement "Custom API Call" instead of refusing it.** n8n injects the option for any
  node with static options and a credential; we answer with a clear refusal. Ruled out for `0.2.0`
  on evidence: no node in `nodes-base` carries the `__CUSTOM_API_CALL__` sentinel, n8n's own
  tooling filters it out, and it is a feature of the *declarative* node style, which this node is
  not. Reopen only with a shape that has precedent. *(P3)*
- **BL-12 · `paired-item-check.mjs` flags `pairedItem` in a type annotation** as `[R6] names
  'number', which nothing in this file binds`. It fails closed, so it is safe — but it would block a
  legitimate refactor that types the emitted row shape. *(P3)*
- **BL-13 · `datasetRow:appendMany` sends a degenerate CSV when every row resolves to `{}`** — a
  body of `"\r\n\r\n\r\n"` is POSTed to `import-csv` and the node reports `rowsSent: 2` as if it had
  written something. There is no guard on `rows.length` or `header.length`. Needs empty items to
  reach, so low severity; it is still a meaningless request reported as a normal result. *(P3)*
- **BL-14 · The router wraps our own `NodeOperationError` in `NodeApiError`.** The message and
  description survive intact, so the author is not misled, but the class is wrong and n8n's own
  nodes rethrow `NodeOperationError` unchanged. *(P3)*
- **BL-15 · Nothing in the committed gate set reads the README.** The `0.2.0` count and table
  correctness was proven by a throwaway script that parses `modes.ts` and the README and asserts
  equal resources, counts, names, descriptions and order — four mutations reddened it. That script
  belongs in `scripts/`, because a README that documents 57 operations while the node ships 62 is
  the defect that blocked this release and no gate could see it. *(P2)*
- **BL-16 · Say the secret-handling facts in the node, not only in the README.**
  `Space > Create`'s **Provider Options (JSON)** cannot carry `password: true` (n8n honours it on
  `string` only), so a provider key pasted there is visible on screen, in an export and in every
  execution snapshot; and the operation's `webhookUrl` response field embeds a routing token oneAI's
  own wizard shows once. Both are now documented in the README; a sentence in each field's
  `description` would reach the author who never opens it. Display text only, so safe on
  `typeVersion: 1`. *(P3)*

## ▶ For the oneAI API owners — not ours to fix

- **BF-1 · `GET /api/spaces/{spaceId}/files/download` returns HTTP 500 for a missing file**, not
  404, with `{"status":500,"errorMessage":"Internal Server Error."}`. A missing file is a client
  error, and a 500 reads as an outage to anyone monitoring it.
- **BF-2 · No endpoint deletes a data table.** Every other part of the dataset lifecycle exists.
  A workflow can create tables it can never remove.
- ✅ **BF-3 · CLOSED 2026-09-04** — `modes.ts` described `artifact:create` as "Create an artifact
  from a file" when the operation takes a space, a name and an optional source chat/message. The
  dropdown text and the README now say what it does. Session 0002.

## ▶ Closed

- ✅ **OWNER-5 · The publish path is reproducible.** `package-lock.json` is committed and CI runs
  `npm ci`; the actions are pinned to commit SHAs; `npm install -g npm@latest` is gone. 🔴 **Not
  closed by this:** five of the locked packages still execute install scripts, and `dist/` is still
  built inside the publishing job by `prepublishOnly`, so an install script can still act before the
  compiler. What changed is that the set is now fixed and auditable rather than resolved afresh on
  every publish — and the `npm-publish` environment puts a human in front of it. Filed as **BL-18**.
- ✅ **OWNER-3 · The node is a `VersionedNodeType`.** Structure only: one version, `1`, no behaviour
  change. `getNodeType(1)` resolves, `typeVersion: 1` still runs saved workflows (both demo
  workflows re-run green on the bench), and the panel is unchanged — 64 actions, icon and categories
  identical before and after. A version 2 can now be added **beside** 1 instead of replacing it.
  🔴 `nodeVersions` is a map with no fallback: a key that has ever been saved must stay in it.

  No parameters were renamed. Three candidates were examined and none survived: `Dataset` /
  `Dataset Row` is the owner's vocabulary and was chosen deliberately over the API's "tables";
  `dataset:list` beside `listSpaces` is consistent with twenty other `list` operations; and
  `providerOptionsJson` cannot be masked because of an n8n limitation that a rename does not touch.

- ✅ **OWNER-1 · Merged and released.** `0.2.0` is on npm with provenance, verified against the
  downloaded tarball. Session 0002.
- ✅ **OWNER-4 · The parked files are gone, and one of them was not dead.** 27 files removed;
  `auditLog` was **wired up instead**, because its endpoints are alive in the spec and `CLAUDE.md`
  records Audit Logs as owner-named core surface. Its request shapes had never been checked — the
  drift check passed them on the first run. 🔴 **Zero parked files for the first time**: every file
  in `actions/` is now reachable, and the package drops from 118 to 85 JavaScript files.
- ✅ **BL-11 · `panel-check` now counts operations a second way** and compares, so removing an
  `action` key is a finding rather than a silently smaller number. Session 0002.
- ✅ **BL-17 · The bench runs the published `0.2.0`** from npm, and `installed_packages` says so.

- ✅ **The README documented 57 operations, omitted five that ship, and denied two of them in
  prose** — the release blocker. Regenerated from `modes.ts` and verified mechanically.
  Session 0002.
- ✅ **BL-6 · `project:archive`, `project:unarchive` and `project:instantiateTemplate`** — the
  honest restoration of what the removal of `project:create` / `project:delete` cost. Session 0002.
- ✅ **BL-7 · `artifact:exportPptx`** — the sibling of the repaired `exportPdf`. Session 0002.
- ✅ **`dataset:listSpaces`** — the operation that makes `List Spaces → List → Append` composable
  without a pasted-in space ID. Session 0002.
- ✅ **BL-8 · Percent-encoding of interpolated path segments** — 39 remaining sites closed; all 72
  interpolations in `/api` path templates now go through `encodeURIComponent`. It was never a
  privilege escalation, but with `usableAsTool: true` an author-supplied ID could select a different
  path on the instance for the operation's fixed method. Session 0002.
- ✅ **`paired-item-check.mjs` did not recurse into subdirectories** — the same hole as the
  `helpers.ts` one, a directory deeper, and it reported clean on genuinely wrong lineage.
  Session 0002.
- ✅ **Nothing asserted `incremental: false`** — the setting that stands between the publish path
  and a "successful" build that emits no JavaScript. `panel-check.mjs` R4 now asserts it.
  Session 0002.
- ✅ **BL-3 / the nodes panel** — the node is findable, confirmed by the owner in the real panel.
  Two causes, both live-measured; `scripts/panel-check.mjs` guards both. Session 0001.
- ✅ **`pairedItem` named the wrong item in 65 of 78 files** — fixed and pinned by
  `scripts/paired-item-check.mjs`; defect and fix both observed in a running n8n.
  Session 0001, PR #2.
- ✅ **13 drift failures + 2 warnings** across `chat`, `space`, `project` and `artifact` — 0.
  Session 0001, PR #2.
- ✅ **oneData datasets** — ten operations across `dataset` and `datasetRow`. Session 0001, PR #3.
  *Carried forward:* BL-2, BL-5.
- ✅ **`dist/tsconfig.tsbuildinfo` shipped to npm** — and the first fix for it made the build emit
  no JavaScript at all while reporting success. `incremental` is now off, must stay off, and is now
  asserted. Session 0001, PR #2; assertion Session 0002.
- ✅ **Provider values that the API never accepted** in `space:create` and `space:list` — corrected,
  with legacy values translated at execute time so saved workflows start working. Session 0001, PR #2.
- ✅ **README promised three features the node does not have** — streaming, tool/function calling,
  Temperature. Session 0001, PR #3.
- ✅ **`CLAUDE.md` counts and status claims had gone stale** — measurements replaced by the commands
  that produce them. Session 0001, PR #3.
