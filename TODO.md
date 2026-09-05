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

**Frontier (2026-09-05): `0.3.0` is published.** npm `latest` is **0.3.0**, verified against the
registry rather than the CI log — shasum `87b184c4…` matches, 302 files, a SLSA provenance
attestation is attached, and the package still declares **zero runtime dependencies**. 🔴 **And the
build reproduced:** the published tarball's `dist/` is **byte-identical** to a local build of `main`
— 302 files, 0 differences, tarball sha1 matching the registry. `CLAUDE.md` warns that what ships is
"not provably what anyone tested" because `dist/` is built in the publish job from dependencies
resolved that minute. For this release that is **empirically false**; the structural risk stands
(reproducing once does not guarantee it), but the claim in its strongest form does not. The node
ships **75 operations across 11 resources**, measured by `node scripts/drift-check.mjs`, which
parses the router and is the authority. `typeVersion` stays **1**.

🔴 **The publish path broke on its first use after being hardened, and we caused it.** The first
`v0.3.0` attempt failed with `404 Not Found` on `PUT` — a disguised authentication failure. OIDC
trusted publishing needs npm CLI **>= 11.5.1**; Node 22 bundles npm 10; and
`ffa3d8a "Make the publish path reproducible"` had removed the global CLI upgrade as an
unreproducible step. It was not cosmetic — it was what made publishing possible. No release ran
between that change and this one, so nothing could reveal it. Fixed in PR #13 by pinning
`npm@12.0.2`, which keeps both properties. A signed provenance statement had already reached the
sigstore transparency log before the PUT failed, so an attestation exists for a version that was
never published; the release was deleted and re-cut at the fixed commit.

🟢 **Deployed on the bench:** `https://n8n.oneai.de` (n8n **2.37.9**) runs the published
`@oneai-eu/n8n-nodes-oneai@0.3.0` from npm — not a local build — and `installed_packages` says
`0.3.0`. Verified in the container: 75 operations, `usableAsTool: true`. The demo workflow
`oneAI · v0.3.0 demo — ingestion completion loop` and its credential persist under the owner's
account.

**Rollback.** Settings → Community nodes: uninstall, then install `@oneai-eu/n8n-nodes-oneai@0.2.0`.
The shell equivalent inside `oneai-devtest-n8n` is
`cd /home/node/.n8n/nodes && rm -rf node_modules/@oneai-eu/n8n-nodes-oneai && npm install @oneai-eu/n8n-nodes-oneai@0.2.0`
followed by `docker restart oneai-devtest-n8n` on the host. The `rm -rf` is not optional.
`docker restart` is the only container verb allowed there; `oneai-devtest-n8n-ralf` is a colleague's.

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

- **BL-19 · The five Dependabot alerts are toolchain-only, and cannot be fixed from here.**
  Assessed 2026-09-04, per advisory rather than by counting: 3 HIGH `nanoid`
  (`GHSA-xwg4-73v4-xw9w`, `GHSA-2v37-7h3g-55p8`, `GHSA-28wg-ghj8-5hjv`), 1 MEDIUM `stream-json`
  (`GHSA-528h-pc64-c93x`), 1 MEDIUM `uuid` (`GHSA-w5hq-g745-h8pq`).

  🟢 **None of them reaches a user of this node.** `package.json` declares no `dependencies` at all
  and `files: ["dist"]`, so the published tarball contains **zero** `node_modules` entries —
  verified with `npm pack --dry-run`.

  🔴 **Do not be misled by Dependabot calling `nanoid` "runtime" scope.** It arrives through
  `n8n-workflow → @n8n/utils`, and `n8n-workflow` is our **peerDependency**: npm marks
  peer-derived packages as non-dev, which is a labelling artefact. The `nanoid` a user actually
  runs is whichever their own n8n ships. `stream-json` and `uuid` come through
  `@n8n/node-cli → @n8n/ai-node-sdk` and are pure build tooling.

  Not reachable in our build either: `n8n-node build` is `rimraf` + `tsc`, so `n8n-workflow`'s
  runtime code is never executed — 70 of our imports from it are `import type`, and the four
  value imports run inside the user's n8n, not ours.

  **They cannot be patched from here.** `@n8n/utils` pins `nanoid` at exactly `3.3.8`, not a range,
  so `npm update` moves nothing (tried; the lockfile did not change). Only an `overrides` entry
  would force it — overriding a pin n8n chose, inside a package we do not ship, for no user benefit
  and a real chance of breaking build or lint. **Revisit when `@n8n/node-cli` or `n8n-workflow`
  update**, not before. *(P3)*

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
- 🔴 **BL-28 · The certification scanner's lint CAN be reproduced locally, and our gate set does not
  do it.** `CLAUDE.md` says the scanner "cannot gate local code" because it downloads from npm. True
  of the scanner — **but not of its verdict**. `npx eslint nodes/ credentials/ --no-inline-config`
  reproduces exactly what it reports, before anything is published.

  The gap it hides: **our `npm run lint` honours inline `eslint-disable` comments and the scanner
  does not.** Two suppressions ship today —
  `nodes/OneAi/modes.ts:240` (`node-param-default-missing`) and
  `nodes/OneAi/v1/OneAiV1.ts:147` (`require-continue-on-fail`) — so the gate is green while the
  scanner is ❌. Add the `--no-inline-config` run to the gate set. *(P2)*
- 🔴 **BF-6 · `@oneai-eu/n8n-nodes-oneai@0.3.0` fails `@n8n/scan-community-package`**, and so does
  `0.2.0` — verified against both published versions, so this is **not a regression from the
  v0.3.0 work**. It arrived with the static `resource`/`operation` options that made the node
  findable again.

  One violation: `modes.ts:241` `n8n-nodes-base/node-param-default-missing`. 🔴 **A `default` is
  present** at line 251 (`DEFAULT_OPERATION_PER_RESOURCE[r.value] ?? ''`) — the rule requires a
  **literal** and cannot read a computed one. Measured, not assumed: replacing it with
  `default: ''` clears the error; removing only the `??` does not. So the two options are a literal
  empty default, which costs the per-resource preselected operation, or writing the eleven property
  blocks out by hand with literal defaults, which costs `modes.ts` as the single source of truth.
  **Owner's call; it is a trade, not a bug fix.** *(P2)*

- ✅ **BF-7 · CLOSED — `space:downloadFile` can no longer label a file `text/plain`.** It was the
  one shipped call site passing no MIME type to `prepareBinaryData`, whose sniffing fallback is
  `text/plain`. Fixed in `0.3.1`. 🔴 **The fix is wider than the finding was:** `convert` changes
  the format the server sends ("DOCX to PDF, XLSX to ZIP of CSVs"), so with it on the source path's
  extension describes bytes that never arrived — deriving from it would have produced a *confident
  wrong* label rather than a vague one, which is worse than the defect. The type is now derived from
  the extension only when there is one **and** nothing was converted; both other cases send
  `application/octet-stream`. All nine call sites re-swept with a brace-matching parser: the other
  eight already passed a type. *Carried forward:* no checker asserts this property — a naive "every
  `prepareBinaryData` takes three arguments" rule would wrongly flag the deliberate two-argument
  branch, so it needs the guard encoded, which is BL-shaped work nobody has done.

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
  question left open, and the live trace then confirmed it was not redundant. Session 0005.
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
