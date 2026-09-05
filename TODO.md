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

**Frontier (2026-09-04, night): `0.2.0` is published; `v0.3.0` is on a branch, deployed to the
bench, and unreleased.** npm `latest` is **`0.2.0`**. `package.json` on
`feat/v0.3.0-loops-and-compliance` (HEAD `45ab7ff`) still says **`0.2.0`** — 🔴 the bump to `0.3.0`
is the owner's act at release time, and the hook correctly refused it during the run.

The branch ships **75 operations across 11 resources**, measured by `node scripts/drift-check.mjs`,
which parses the router and is the authority. All gates green: drift 0 findings over 75 operations
and 90 API calls with 0 parked and the registry agreeing, lineage 0 over 84 sites, panel 75
operations with an action string, lint 0, `tsc` 0, cold and warm builds emit 98 `.js`,
`as any` / `: any` = 0. See `SESSION-HISTORY.md` § Session 0004.

🔴 **Three counts in the previous frontier were wrong and are corrected here, because they were
repeated downstream for a day.** `0.2.0` was described as *prepared and unreleased* with npm `latest`
at `0.1.9` — it was published. The node was described as **62 operations across 10 resources** — at
`0.2.0` it was **64 across 11**, `auditLog` having been wired up in the same session. And the bench
was described as running `0.1.9-pr3` — it was running `0.2.0` before this run replaced it.

🔴 **Only the owner releases.** Publishing is `gh release create` — not a tag, not `npm publish` —
and it ships whatever `package.json` says at the tagged commit, over OIDC trusted publishing with no
token to revoke. `0.2.0` is already on npm, so a release cut before the version is bumped would fail
the publish job rather than overwrite anything.

🟢 **Deployed on the bench:** `https://n8n.oneai.de` (n8n **2.37.9**) runs the branch as the
community package `@oneai-eu/n8n-nodes-oneai`, marked **`0.2.0-bench.45ab7ff`** — a version that
cannot exist on npm, so it can never be mistaken for a release, and it names the commit it was built
from. Verified after the deploy by reading n8n's own type cache in the container: the loaded node
`@oneai-eu/n8n-nodes-oneai.oneAi` carries **75 actions** and codex categories
`["Data & Storage","Productivity"]`, and the generated `…oneAiTool` variant carries `["AI"]` —
which is the split that keeps the node findable in panel search. `typeVersion` is still `1` only,
and none of the owner's 26 saved oneAI nodes was touched.

🟡 **Thirty seconds of the owner's time still closes one leg:** type `oneai` into the nodes panel on
`n8n.oneai.de` itself. The panel was proven in a real browser this run, but on an identically
installed throwaway n8n 2.37.10, because no sign-in for the bench was available.

**What is on the bench to try.** Workflow *oneAI · v0.3.0 demo — ingestion completion loop
(trace 2026-09-04)*, id `oneaiV030Demo`, inactive, in the owner's personal project: create space →
build a document → Convert to File → **Upload File** → Wait → **Get File Stats** → IF `pending` is 0
(loops back to the Wait) → **List Folder** → **Get Extracted Text** → **Rename File**, with a sticky
note explaining it. It makes its own space on every run, so it leaves nothing a later run trips over
— delete those spaces if you do not want them. It runs on credential *oneAI trace v0.3.0 (user key)*,
id `traceUserCred030`, pointing at `http://oneai-devtest:3000`; its `oai_` key persists on devtest
under the standing authorisation so the demo is runnable, and revoking it from the oneAI profile page
breaks nothing else. The three older demo workflows (`oneAI · 1/2/3`) and credential *oneAI devtest
(bench, 2026-09-04)* are still there, with their oneData space **n8n Demo Data**, table `contacts`.

**Rollback to the released npm build.** Prefer **Settings → Community nodes → oneAI → Uninstall**,
then **Install** `@oneai-eu/n8n-nodes-oneai`, which resolves `latest` = `0.2.0` and rewrites the
`installed_packages` row at the same time. By hand:

```bash
ssh adminui-dev
docker exec -u node -w /home/node/.n8n/nodes oneai-devtest-n8n \
  npm install @oneai-eu/n8n-nodes-oneai@0.2.0 --no-audit --no-fund
docker exec oneai-devtest-postgres psql -U postgres -d n8n \
  -c "update installed_packages set \"installedVersion\"='0.2.0' where \"packageName\"='@oneai-eu/n8n-nodes-oneai';"
docker restart oneai-devtest-n8n
docker exec oneai-devtest-n8n sh -lc 'wget -qO- http://localhost:5678/healthz'   # then re-check the type cache
```

The marker version does not exist on npm, so this install really does move the tree — unlike the
`0.1.9` round, where the installed tree already claimed the target version and the same command was
a silent no-op. `docker restart` is the only container verb allowed on that host, and
`oneai-devtest-n8n-ralf` is a colleague's.

---

## ▶ Needs the owner — blocking nothing, but nobody else can rule

- **OWNER-10 · The `n8n-workflow` peer floor, or a Compatibility note instead.** The security audit
  bisected published `n8n-workflow` tarballs: on **≤ 1.98.0** (n8n ≤ 1.101.0) a thrown `NodeApiError`
  keeps the original axios error as `cause`, so `config.headers.Authorization` is reachable in the
  persisted execution record; on **≥ 1.99.0** (n8n ≥ 1.102.0) a class field shadows it away. We
  declare `"n8n-workflow": "*"` and no `engines`, so we claim exactly the hosts where it leaks. The
  run mitigated it at our own seam — the credential is stripped from a failed request before
  `NodeApiError` sees it — and the README's **Compatibility** section now states the host-version
  fact. What is still the owner's: whether to raise the peer floor (which drops those users) or leave
  it at `*`. 🔴 The scrub is proven *not* load-bearing on the bench's n8n 2.37.9 — with it removed
  the persisted record was byte-identical and still clean — and **NOT-REACHED** on an older host,
  because none was available. It stays because `*` means we do not get to assume the newer host.
- **OWNER-7 · A `oneAI Chat Model` sub-node.** An LLM sub-node that n8n's AI Agent could use with the
  oneAI Gateway, rather than an action node an agent calls as a tool. Named as a separate spike when
  the v0.3.0 scope was ruled, and deliberately not part of that run. *(no work done)*
- **OWNER-2 · `main` has no branch protection and no rulesets, and five collaborators hold
  admin + push.** Publishing is triggered by *creating a GitHub release*, authenticated by OIDC
  trusted publishing — so there is **no token to revoke** and the entire control surface is who may
  create a release. A compromise of any one of the five accounts ships to npm with a valid
  provenance attestation, which is the trust signal. *Corrected 2026-09-04:* this entry also said
  there was no `environment:` gate on the publish job. There is one now — `environment: npm-publish`,
  requiring a review before any step runs — so a compromised account still needs an approval. The
  branch-protection half of the item is unchanged.
- ✅ **OWNER-6 · CLOSED — the node is findable again**, by static `resource`/`operation` options
  generated from `modes.ts`, each carrying an `action`. Session 0001, PR #2. *Carried forward:* a
  static list cannot be filtered by the credential, so a Gateway-only credential sees hub operations
  in the dropdown and `isOperationAllowed` refuses them at runtime — that trade is still the owner's
  to revisit; and n8n's injected "Custom API Call" entry is refused rather than implemented (BL-10).

## ▶ Open work

### Checker gaps, every one proven by mutation

Each of these was demonstrated by breaking the code and watching the gates stay green — 19 mutations
were applied and reverted, 16 expected red and 16 actually red, and what follows is what stayed
silent. They are filed together because they are one class: a rule that only looks where it expects
the defect.

- **BL-21 · A renamed request *body* field FAILs the drift check; a renamed *query parameter* only
  WARNs and the run exits 0.** Measured twice (`since` → `sinceTime` on `auditLog:list`, `thumbnail`
  → `thumb` on `chat:getBlob`): one WARN each, exit 0. `since` is where it bites — a typo ships green
  and silently disables the filter the compliance-poll story depends on. Raising the severity is the
  checker owner's call, and the argument for it is that n8n does not validate parameters either.
  *(P2)*
- **BL-23 · The drift check does not descend into nested request-body objects.** `auditLog:export`'s
  `fields` is compared as one `object` key, so renaming a key inside it (`userId` → `user_id`)
  produces no finding — while the endpoint declares `additionalProperties: false`, so a real server
  rejects it. 🔴 The only thing standing between that and a shipped 400 is the local
  `Record<AuditLogExportField, boolean>` annotation over a closed union, which makes it a compile
  error. **That annotation is load-bearing and must not be relaxed to `Record<string, boolean>`** —
  weakened, all five gates go green on a broken request. *(P2)*
- **BL-24 · Two classes produce no red anywhere.** Breaking `auditLog:export`'s output constants
  (`audit-logs.zip` → `audit-logs`, `application/zip` → `application/octet-stream`) and reinstating a
  dead enum value in `auditLog:list`'s `origin` both leave `tsc`, lint, drift, lineage and panel at
  exit 0. The first breaks the very next node in the workflow; the second can only ever produce a
  400. An enum-value tier is the natural home for the second. *(P3)*
- **BL-25 · `paired-item-check.mjs` reads helper files under `actions/` only.** The relocation
  mutation the house rule demands is caught there now, but the same shadowing defect in a helper one
  directory up — `nodes/OneAi/lineage.ts`, `nodes/OneAi/transport/` — leaves all five gates green.
  Nothing does this today, so it is latent. Widening the glob to `nodes/OneAi/**` is a one-line
  change to the checker's own scope. *(P3)*
- **BL-20 · `panel-check.mjs` reads `modes.ts`, and hard-codes `OneAi.node.ts`.** Two consequences.
  It does **not** move when a router arm is removed — commenting out a `case` dropped the drift check
  to 74 while panel-check still reported 75 — so it is not a second opinion on the shipped surface,
  and nothing should be inferred from its count alone. And a second node file (a trigger node, for
  instance) would be invisible to it entirely, which makes this a prerequisite for any second node
  rather than a tidy-up. *(P2)*

### Everything else

- **BL-19 · Five open Dependabot alerts, all toolchain-only.** `stream-json` (medium),
  `nanoid` ×3 (high) and `uuid` (medium), all transitive **devDependencies** of the n8n tooling. The
  package has **zero runtime dependencies**, so none of them is reachable by an installed node; the
  exposure is the build host, not a user's n8n. v0.3.0 adds no dependency of any kind. Worth clearing
  or dismissing with a reason, so the repository's alert count means something. *(P3)*
- **BL-22 · Agent Builder (`api/agent-definitions`) stays out.** Owner ruling: not finished in oneAI
  yet. Also `POST …/runs` takes a body of `{}` with `additionalProperties: false`, so a run cannot be
  parameterised, and shipping even `agent:list` would freeze the resource name `agent` against a
  moving API for the life of `typeVersion: 1`. Reopen when the oneAI side settles. *(P3)*
- **BL-26 · `space:embedFiles` drops the context its successor needs.** It emits only
  `{ queuedCount, skippedCount }`, without the `spaceId` and `paths` it was given, so a workflow
  cannot wire onward from it and has to re-supply both. Deferred deliberately in v0.3.0: the
  ingestion story wires from `space:uploadFile`, which does carry them, and changing what a shipped
  operation returns is a larger act than adding an optional input. *(P3)*
- **BL-27 · Five older binary operations drop incoming `item.binary`.** `ai:generateSpeech`,
  `artifact:exportPdf`, `artifact:exportPptx`, `dataset:exportCsv` and `space:downloadFile` replace
  the item's binary map instead of adding to it, so a file carried in from upstream is lost. The two
  binary operations added in v0.3.0 copy it forward, which is what Google Drive's download node does;
  retrofitting the five was explicitly ruled out of that run as a behaviour change to shipped
  operations. *(P3)*
- **BL-18 · Install scripts still run in the publish job.** Five of the locked packages execute at
  install time (`cpu-features`, `isolated-vm`, `ssh2`, `unrs-resolver`, and
  `eslint-plugin-n8n-nodes-base`, whose `preinstall` fetches from the registry), and `dist/` is
  built in that same job. `--ignore-scripts` would break the native builds that lint depends on, so
  the real fix is to build the artefact somewhere the devDependencies are not installed. *(P2)*
- **BL-1 · A response tier for `drift-check`.** It compares requests only. Two real defects lived in
  the response side (`artifact:exportPdf`, `space:downloadFile`) and no tier could see either. The
  by-hand sweep that found them — compare each call's declared `200` content type against its
  transport helper — is the shape of the check. Swept by hand again for v0.3.0: **90 of 90 calls,
  0 mismatches**, and the script that did it had to be taught a *fourth* transport helper
  (`oneAiApiRequestBinary`, 3 calls) before it was complete — which is itself the argument for
  making it a tier instead of rewriting it every run. *(P2)*
- **BL-2 · Trace the six untraced dataset operations** — `updateSchema`, `importCsv`, `exportCsv`,
  `update`, `delete`, and the `defineBelow`/`json` data modes — plus `continueOnFail` on both the
  item loop and the `appendMany` arm. *(P2)*
- **BL-4 · Generate types from `openapi/openapi.json`,** the way the platform generates
  `src/openapi.gen.ts`. Until then "follow the spec's types" is a habit a reviewer must police
  rather than something the compiler enforces. *(P2)*
- **BL-5 · A dataset trigger.** Named by the architect as the highest-value follow-up, and blocked:
  the API gives a poller no cursor. Needs an API-side change. *(P3)*
- **BL-9 · Gateway-plan behaviour is unproven.** Both key classes were exercised again in v0.3.0 —
  `oai_` against `/api/auth/check` and `oai-gk_` against `/api/openai/v1/models`, both 200, and the
  gateway key drove a real AI Agent through an OpenAI-compatible chat model — but the devtest org's
  plan is `team`, so the `oai-gk_` key was minted with that prefix directly. Prefix **routing** is
  proven; genuine Gateway-plan **gating** still needs a Gateway-plan org on devtest. *(P3)*
- 🔴 **BL-10 · Implement "Custom API Call" instead of refusing it. Raised from P3 to P1 on
  evidence.** The reason it was P3 was that nobody used it. Somebody does: the owner's own workflow
  *"🌅 Morgen-Briefing – Emails + weclapp Angebote → KI-Aufgabenplan → Teams"* on the bench contains
  a oneAI node whose operation is `__CUSTOM_API_CALL__` — n8n's injected entry, which this node
  **refuses at runtime**. That workflow cannot run as saved. Found by reading what people actually
  built; no checker in this repository could have found it, and none can regress-test it either.
  The `0.2.0` reasoning against it still stands on its own terms (no node in `nodes-base` carries
  the sentinel, n8n's own tooling filters it out, and it is a feature of the *declarative* node
  style, which this node is not) — so the shape needs deciding, but "unused" is no longer an
  argument. *(P1)*
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
  the defect that blocked that release and no gate could see it. **Written and thrown away a second
  time** for v0.3.0 — 11 headings, 75 rows, names and descriptions verbatim, all clean — which is two
  runs in a row of rebuilding the same check by hand. *(P2)*
- **BL-16 · Say the secret-handling facts in the node, not only in the README.**
  `Space > Create`'s **Provider Options (JSON)** cannot carry `password: true` (n8n honours it on
  `string` only), so a provider key pasted there is visible on screen, in an export and in every
  execution snapshot; and the operation's `webhookUrl` response field embeds a routing token oneAI's
  own wizard shows once. Both are now documented in the README; a sentence in each field's
  `description` would reach the author who never opens it. Display text only, so safe on
  `typeVersion: 1`. *(P3)*

## ▶ For the oneAI API owners — not ours to fix

- 🔴 **BF-4 · `POST /api/audit/logs/export` returns HTTP 500 for every caller.** The hub answers
  `{"errorMessage":"Internal Server Error."}` and logs
  `PostgresError: column reference "org_id" is ambiguous` (SQLSTATE **42702**). The cause is visible
  in oneAI's own source: `src/api/audit/export.ts` runs
  `FROM audit_logs al JOIN users u ON al.user_id = u.id ${filterClause}`, while
  `buildAuditLogFilters` at **`src/api/util/audit.ts:1356`** emits an **unqualified**
  `` WHERE org_id = ${orgId} ``, so the predicate is ambiguous whatever the request body says —
  reproduced with `csv` and `json`, with and without `from`, with and without `origin`.
  `/api/audit/logs` (list) runs `FROM audit_logs` with **no join** and is unaffected. **This is
  broken for everyone, not only for this node**, and it is why our `auditLog:export` — verified
  correct against the spec, and proven to produce an archive the Compression node opens when the
  endpoint answers — has never been traced end to end.

  *Corrected 2026-09-05.* The trace report first cited `audit.ts:1101`; that line is the TypeScript
  field `lastNameLength?: number`, not SQL. Re-derived from a clean checkout of `origin/main` at
  `45819b7d`: the builder is at 1348-1382 and the offending line is **1356**.

  🔴 **It is not a one-line fix, which is what the earlier wording implied.** Column overlap read
  from the live devtest database rather than from the source: `audit_logs` has
  `id, org_id, user_id, origin, created_at, data`; `users` has `id, org_id, email`. **`org_id` is
  the only ambiguous one** — `user_id`, `origin` and `created_at` exist on `audit_logs` alone, so
  the builder's other three predicates are safe today. But `buildAuditLogFilters` is shared by both
  callers, and they alias differently: `list.ts:176` selects `FROM audit_logs` with no alias, so
  writing `al.org_id` into the builder **breaks list instead**. The fix is to give `list.ts` the
  same `al` alias and qualify every predicate in the builder, or to pass the alias in — and the
  reason to qualify all four rather than only `org_id` is that the next join added to either caller
  brings the same class of failure back.
- **BF-5 · `thumbnail: true` is a no-op on chat blobs.** `GET /api/chats/{chatId}/blobs/{blobId}`
  and the blob-URL endpoint both accept it, and the full and thumbnail responses came back
  **byte-identical** (19 758 B) on the devtest build — confirmed by calling the API directly, without
  the node, so it is server-side. The parameter is exercised by the node but its effect is
  unobservable, which means nobody can tell a working thumbnail from a silently ignored one.
- **BF-1 · `GET /api/spaces/{spaceId}/files/download` returns HTTP 500 for a missing file**, not
  404, with `{"status":500,"errorMessage":"Internal Server Error."}`. A missing file is a client
  error, and a 500 reads as an outage to anyone monitoring it.
- **BF-2 · No endpoint deletes a data table.** Every other part of the dataset lifecycle exists.
  A workflow can create tables it can never remove.
- ✅ **BF-3 · CLOSED 2026-09-04** — `modes.ts` described `artifact:create` as "Create an artifact
  from a file" when the operation takes a space, a name and an optional source chat/message. The
  dropdown text and the README now say what it does. Session 0002.

## ▶ Closed

- ✅ **OWNER-9 · The v0.3.0 scope, ruled by the owner and delivered.** Three loops closed —
  file ingestion, chat artefacts, compliance review — as `space` +4, `chat` +5 and `auditLog` +2.
  Eleven operations shipped where ten were ruled: `space:renameFile` was added under the one scope
  question left open, and the live trace then confirmed it was not redundant. Session 0004.
  *Carried forward:* BL-20 … BL-27 and BF-4 / BF-5, all opened by that run.
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
  *Superseded 2026-09-04 night:* the bench now runs the v0.3.0 branch as `0.2.0-bench.45ab7ff`, a
  marker that cannot exist on npm — see the frontier for the rollback.
- ✅ **`auditLog:list` under-delivered at its own default, silently.** The endpoint caps a page at 30
  and clamps rather than rejecting, so asking for 50 returned 30 and said nothing — shipped in
  `0.2.0`, found by running it, fixed in the v0.3.0 branch by paging until the limit is satisfied.
  The cap lives in the spec as prose and not as a schema `maximum`, so no drift tier could see it.
  Session 0004.
- ✅ **The credential could reach the persisted execution record on older hosts.** Stripped at our own
  seam now, for all four transport helpers. What that does **not** close is the peer-floor question —
  **OWNER-10**. Session 0004.

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
