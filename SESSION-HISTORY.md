# n8n-nodes-oneai — Session History

> Append-only log. Newest at top. Maintained by the `node-docs` agent as the last phase of a run.
> Line count grows monotonically: correct a past entry by adding a note to it, never by deleting it.
>
> **What belongs here:** what was decided and **why**, what was overturned, what a live trace
> actually proved, and what was **not** reached. The diff says what changed; this says why anyone
> chose it. **What does not belong here:** phase reports and orchestration prompts — those stay
> untracked in `docs/orchestration/` — and never a credential, a key or a host password.

---

## Session 0003 — What the next release should be, and three doors that turned out to be closed (2026-09-04)

**Pre-analysis only. No node code changed.** The owner asked, after `0.2.0` reached npm, which oneAI
capabilities are valuable to a workflow author and still missing. Two agents ran **independently and
with different mandates** — an architect that proposes, and a coverage map explicitly forbidden from
recommending anything — so the proposal could be checked against measured facts instead of trusted.
Every load-bearing claim was then re-verified by hand. Full report:
`docs/ANALYSIS-2026-09-04-v0.3.0-candidates.md`.

**Measured baseline:** 61 of 401 spec operations covered (15.2%), by two extractors whose covered
sets differ by ∅. That percentage is recorded as *not* the finding — the rejection list is the more
useful half.

**Three doors closed, which is why the analysis was worth running:**

1. 🔴 **A webhook trigger is impossible.** All 11 `api/webhooks` endpoints are receivers; no
   `callbacks` object exists in any of the 401 operations. Both agents reached this independently.
   BL-5 was widened rather than duplicated.
2. 🔴 **An agent run takes no input** — `properties: {}`, `additionalProperties: false`. The
   attractive "one run per item, this item as the prompt" story is not available, and would have
   surfaced as a runtime surprise weeks after shipping.
3. 🔴 **`usableAsTool` cannot hide an operation from the tool variant.** Verified in n8n's source:
   `INodeTypeBaseDescription` has no `properties`. Approval verdicts are therefore LLM-reachable in
   one hop → OWNER-8.

**Overturned in-session, by the author of the claim:** an interim finding that the file/embedding
surface was entirely uncovered. Wrong — `space:uploadFile` and `space:embedFiles` ship; the search
had covered `dataset`, `datasetRow` and `reference` but not `space`, which is where the file path
lives. The real gap is narrower and better: 6 of 11 `/files` endpoints ship, and what is missing is
the **completion signal** (`stats`), not the ingestion. Recorded because the corrected finding
became BL-21 and is now the first recommended block of v0.3.0 — the wrong version would have
proposed rebuilding what already exists.

**Recommendation entered:** v0.3.0 = finish the two half-open loops, then Agent Builder and the
compliance loop — ~20 operations, no new dependency, no new `typeVersion`. The chat-model sub-node
is deliberately *not* folded in: it is a spike (OWNER-7) whose one question is worth more than any
operation on the list.

**Owner ruling, same day — v0.3.0 is Block 1 + Block 3.** Agent Builder is deferred: *not finished
in oneAI yet*, so building against it would be premature. The ruling is the safer one for a second
reason the analysis had flagged in passing but not weighted enough: a `typeVersion: 1` operation
must remain in the `nodeVersions` map for the life of the package, so even a single `agent:list`
would have **frozen the resource name `agent` and its operation names against an API still in
motion**. Scope becomes **10 operations** (64 → 74). OWNER-8 narrows with it — `agent:confirm` is
gone, so the LLM-reachable-approval question now concerns `auditLog:review` alone. Deferred work
carried to BL-22.

**Not reached:** whether `GET …/files/extracted` works before embedding completes (one live devtest
request); whether `ChatOpenAIResponses` completes a tool-calling round trip against oneAI. The spec
snapshot is from 2026-09-03 and must be re-taken before implementation.

---

## Session 0002 — The last additions before a release, and the documentation that had to catch up (2026-09-04)

**Package version:** `0.2.0` — set by the owner during the run; npm `latest` is still `0.1.9`.
**Branches:** `feat/onedata-datasets` (PR #3 → PR #2 → `main`). Both still draft; nothing released.
**Agents involved:** `node-implementer` (two passes), `node-validator`, `node-security`, `node-docs`.
**Task:** the owner's own words, from the run's master prompt — *"Owner GO: autonomous, narrow, and
the last additions before a release. Four operations into the existing dataset pull request (#3). Do
not merge, do not release, do not touch `package.json`."* The documentation pass that closes the run
was scoped separately: *"Bring the documentation to the exact shipping state for release `0.2.0`.
This is the last documentation pass before publication to npm, so a claim that is not true is a
defect."*

### What the release contains

`0.1.9` shipped 49 operations across 8 resources. `0.2.0` ships **62 across 10**, measured by
`scripts/drift-check.mjs`, which parses the router rather than the directory and is the only count
worth quoting. The additions are `dataset` and `datasetRow` in full (Session 0001), then five
operations added in this run's two implementer passes:

- **`dataset:listSpaces`** — pinned to `provider=oneData`, and the pin *is* the operation. Every
  other dataset operation needs a space ID the author had no way to obtain from inside the node;
  `space:list` could be filtered to `oneData` only by someone who already knew that a dataset lives
  in a space of that provider, which is a platform concept a node exists to hide. Each item carries
  a top-level `spaceId`, which is exactly what `dataset:list` takes, so `List Spaces → List →
  Append` composes with no glue node — n8n's own item loop is the fan-out.
- **`project:archive` / `project:unarchive`** — the honest restoration of what removing
  `project:delete` cost, since `DELETE /api/projects/{id}` is simply absent from the spec. Two
  operations rather than one with an Action dropdown, because the node creator builds one panel
  entry per operation from its `action` string, and an author looking for "archive" wants to find
  two verbs, not one.
- **`project:instantiateTemplate`** — the replacement for `project:create`, and deliberately not a
  rename of it: it takes a template ID, not a name and a description, and there is no endpoint that
  creates an empty project.
- **`artifact:exportPptx`** — a mirror of the repaired `exportPdf`; the endpoint was found during
  that repair and left unexposed.

### The decision that carries an argument: a refusal is not a success

🔴 `POST /api/projects/bulk` **authorises each project separately and reports refusals with HTTP
200**, in a `failed[]` array. The obvious implementation — return the response and let the workflow
be green — would present a refusal as an accomplished archive.

The node therefore never reads success from the status code. It emits
`{ projectId, action, success, error }` and sets `success: false` with oneAI's own message whenever
the project is not in `succeeded` — including the case where the API names it in neither list, which
is treated as failure because an unmentioned id is not evidence of anything. The validator drove
that reducer through six responses, two of them malformed (`{}` and `succeeded: 'P1'` as a bare
string): correct on all six.

The counter-argument was considered and rejected: throwing a `NodeApiError` on a refusal would abort
the whole execution and discard the API's explanation, for what is a routine partial result on a
bulk endpoint. The cost of the choice is real and is now in the README — **the execution is green
either way, so a workflow that acts on the outcome must branch on `$json.success`.**

### The spelling, settled

**`oneAI` and `oneData`**, never `OneAI` or `OneData`, in every string, description and comment;
the identifiers stay `OneAi` / `oneAi` because they are n8n's node name and TypeScript symbols.
Normalised across the node, the credential, the codex file and the documents. It is a small thing
that is expensive to fix later, because the strings that carry it are the ones users read.

### The release was blocked on documentation, and the blocker was worse than a stale number

The validator's verdict was *"SHIP the code, BLOCK the release"* on three non-code items. The one
that was ours: the README said **57 operations across 10 resources** while the node shipped **62**,
omitted all five operations above — and, under *What this node does not do*, told the reader:

> **No project creation or deletion.** … so neither is guessed at.

Both are now implemented, and a second line pointed the reader at that paragraph. So the shipped
README — which is also the npmjs.org landing page — actively denied a feature of the release it
would have been published with. The commit that added the five operations did not touch the README,
and **nothing in the gate set reads it**.

Fixed by regenerating the tables from `modes.ts` and asserting the result mechanically rather than
by eye: a script that parses both files and requires the same resources in the same order, the same
per-resource counts, and the same operation names *and descriptions*, verbatim. Falsified with four
mutations — a wrong headline count, a deleted table row, an altered description, and `OneData` for
`oneData` — each of which reddened it. (A fifth attempt reported clean and was **my own broken
mutation**, not a hole: the shell had mangled the string before it reached the file. Re-applied
properly, it failed as it should. The house rule about measuring what you think you are measuring
applies to the mutation as much as to the check.) The script itself is not committed; that it should
be is **BL-15**.

Two documentation defects fell out of the same pass and are fixed rather than filed:

- **BF-3, closed.** `modes.ts` described `artifact:create` as *"Create an artifact from a file"*. The
  operation takes a space, a name and an optional source chat and message; there is no file anywhere
  in it. Display text only, so safe on `typeVersion: 1` — and it is the text the dropdown shows, so
  leaving it would have shipped a false claim in the UI and forced the README to either repeat it or
  disagree with the file it is generated from.
- **The Installation section claimed the node is offered "in the node panel of every n8n
  instance."** True only where community nodes are enabled; now says so.

The README also gained what the security audit established and only a user can act on: `Space >
Create`'s **Provider Options (JSON)** cannot carry `password: true` — n8n honours that flag on
`string` parameters only — so a provider key pasted there is visible on screen, in an export and in
every execution snapshot; and the same operation's `webhookUrl` response embeds a routing token
oneAI's own wizard shows once, which then lives in the execution log forever. Saying it in the field
descriptions as well is **BL-16**.

### Discoverability, and what it cost

Carried into this release from Session 0001, because it is the reason the node is usable at all:
`resource` and `operation` are **static options generated from `modes.ts`**, each operation carrying
an `action`. `0.1.9` moved both to `loadOptions`, which yields zero actions to n8n's action-first
node creator and made the node invisible to panel search; `"AI"` on the *main* node's codex
categories then routed it out of search entirely. Both are fixed and both are guarded by
`scripts/panel-check.mjs`.

🔴 **The price is paid every release and should not be quietly forgotten:** a static list cannot be
filtered by the credential, so a Gateway-only credential now shows hub operations in the dropdown
and `isOperationAllowed` refuses them at runtime with a message naming the reason. Credential-aware
filtering was the entire purpose of the `loadOptions` change. The bench measured 62 operation
options carrying an action, and `loadOptionsMethod` count **0** in the deployed JavaScript.

### Two checker holes, found by the validator and closed

Both are of the house type — a rule that only looks where it expects the defect:

1. 🔴 **`paired-item-check.mjs` did not recurse.** It read one directory level, so moving the
   shadowing defect from `dataset/helpers.ts` into `dataset/util/lineage.ts` — one level deeper —
   produced an unchanged site count of 104 and `RESULT: clean, exit 0` on genuinely wrong lineage.
   This is the *second* time the same checker was defeated by relocation; the first was closed by
   widening the glob, which fixed the instance and not the class. It now walks every `.ts` under
   `actions/` at any depth.
2. **Nothing asserted `incremental: false`.** The setting is the only thing standing between the
   publish path and a build that prints "Build successful" and emits **no JavaScript**, which
   `prepublishOnly` (`build && lint`) passes. The validator put the old setting back and measured
   exactly that: build 1 → 118 `.js`, build 2 → 0 `.js`, exit 0, lint 0. `panel-check.mjs` R4 now
   asserts it, on the argument that a node nobody can find and a node that is not there are the same
   failure to a user.

Still open from the same review: `panel-check.mjs` has **no operation-count floor tied to the
router**, so deleting an `action` key outright drops the count 62 → 61 and reports clean — `tsc`
catches it only because the type requires the field, which is coverage by accident (**BL-11**).

### What the audits established

**Validator**, over 12 mutations: 10 reddened as expected, 2 gaps (above), 1 false positive that
fails closed. Beyond the checkers, it drove all 62 operations through the **built** router with a
stubbed transport: 62 dispatch, 62 issue at least one request, and 66 (operation, call) pairs match
the committed spec by path template and method with 0 unmatched — an independent confirmation of
drift tier 1 from URLs the code actually produced rather than from parsed source. Lineage was proven
dynamically as well as structurally: two input items in, `{"item":0}` and `{"item":1}` out, and
`appendMany` emitting the array form for its many-to-one row. A fresh clone on **Node 22**, which is
what CI pins, produced a `dist/` byte-for-byte identical to the local build.

**Security**, as a client and not a platform: the credential is clean on every axis — six call
sites, all `httpRequestWithAuthentication`, the key never read, no custom-API-call escape hatch —
and an AxiosError carrying `Authorization` in `config.headers` was constructed and walked to depth 8
without the secret becoming reachable. Its one finding worth acting on inside the node was **F2**,
now closed as **BL-8**: 39 interpolated path segments went into request paths raw. Resolved
concretely rather than by category, `#` truncates a template's suffix and `..` climbs to any prefix,
which compose into full path control for the operation's fixed method — bounded by the credential's
own authority and unable to change host, but a confused deputy in a node that is `usableAsTool`, and
the model filling an ID field is the realistic path. All 72 interpolations in `/api` templates now
encode. The remaining findings are the owner's (**OWNER-5**, the 527-package install with five
install scripts running before the artefact is built) or n8n's model rather than ours (**BL-16**).

### The bench, measured rather than assumed

`https://n8n.oneai.de` runs the pre-release build. n8n's `installed_packages` row reads
**`0.1.9-pr3`**, which is what the Community nodes page shows — the marker did survive. 🔴 But the
package's **`package.json` on disk reads `0.1.9`**, so anyone inspecting the container instead of the
UI concludes the npm release is installed. Recorded as **BL-17**.

A second thing worth having found: the rollback line this file carried was a **no-op**. Because the
installed tree already claims `0.1.9`, `npm install @oneai-eu/n8n-nodes-oneai@0.1.9` is satisfied by
what is there and does nothing. `TODO.md` now gives the reinstall-from-clean form and prefers the
Community nodes page, which rewrites the database row at the same time.

Deployed build verified by hashing `dist/nodes/OneAi/modes.js` against a local build of `d636473`:
identical but for one reworded resource description. This session's documentation changes are not on
the bench; none of them alters behaviour.

### Not reached

- **The nodes panel in a browser, for this build.** `panel-check.mjs` reads source. The owner typed
  the name into the panel on 2026-09-04 against a build one display string behind; nobody has done
  it since.
- **Any live oneAI request in this run.** Every operation was driven against a stubbed transport, so
  the five new operations are verified against the committed spec and **not** against the instance.
  `project:archive`'s refusal path in particular has never been observed against a real 200.
- **`@n8n/scan-community-package` on this code.** Structurally impossible before publication: it
  downloads by package name from npm. What it certified is `0.1.9` at commit `aef3e2e`.
- **BL-2 and BL-9** are unchanged — six dataset operations untraced through n8n, and Gateway-plan
  behaviour still unproven because the `oai-gk_` key was minted against a `team`-plan org.

## Session 0001 — Repair the node, then give it datasets (2026-09-03 → 2026-09-04)

> **Addendum, 2026-09-04 (morning).** Added after the owner reviewed the run, per the rule that a
> past entry is corrected by adding to it. Three follow-ups, all in PR #3:
>
> - **`CLAUDE.md` was carrying three kinds of thing at once** — durable rules, status that goes
>   stale, and unowned open items. Measurements in prose were replaced by the commands that produce
>   them (its `IDataObject` count had drifted to less than half the real number), the `pairedItem`
>   section now separates the lesson from the closed status, and the facts a checker can never find
>   got their own section.
> - **`TODO.md` and `SESSION-HISTORY.md` introduced**, tracked, following the oneglue convention,
>   with `node-docs` owning them every run. Owner's framing, and it is the right one: `CLAUDE.md`
>   holds what is always true; state and history belong elsewhere.
> - 🟢 **RESOLVED — the node is findable, and it took TWO fixes, not one.** The owner confirmed it
>   in the real panel. Cause 1 was the action-first creator reading static `options` (fixed:
>   `resource`/`operation` generated from `modes.ts`, 0 → 57 actions). That alone was **not enough**.
>   Cause 2 was `"AI"` in the MAIN node's codex `categories`, which routes a node into the AI branch
>   of the creator and out of the search — and it had been added **that same morning**, copied from
>   the Perplexity node whose findability nobody had checked. Removing it is what made the node
>   appear.
>
>   Honest limit on the causal claim: state B (57 actions + "AI") was unfindable and state C (57
>   actions, no "AI") is findable, so cause 2 is proven decisive. "Zero actions and no AI category"
>   was never tested, so cause 1's necessity for mere findability is **unproven** — it is right
>   anyway, because it is what puts the 57 operations in the panel as actions.
>
>   Two measurement errors of mine along the way, both of the house type. I found
>   `maxAge = Time.days` and concluded the browser cached the node list for a day; read in context
>   that applies to other static files, while the type files are served `no-cache, must-revalidate`.
>   And I read the type cache **before the restart had finished rewriting it**, saw old categories,
>   and concluded that n8n does not reload a package at an unchanged version. The file was simply
>   five bytes shorter a moment later — exactly the length of `"AI",`.
>
>   `scripts/panel-check.mjs` now enforces all three properties (static options, an `action` on every
>   operation, no "AI" on the main node), falsified by five mutations. **But the check reads source,
>   not a browser** — the acceptance test is still a person typing the name into the panel.
> - 🔴 **U-7 is answered, and the answer is a shipped defect: the node is unfindable in the nodes
>   panel.** The owner searched "oneai" in the panel and got nothing. The mechanism was then
>   established rather than guessed: n8n's node creator is **action-first** and builds a node's
>   actions from the **static `options` arrays** on `resource` and `operation`. `0.1.9` moved both
>   to `loadOptions`, so the node yields **zero actions** and search does not surface it.
>
>   Measured on the bench: oneAI 0 static options / 0 action strings; Slack 7 and 17 options / 7
>   actions; Perplexity — the minimal shipped node the codex was modelled on — 1 and 1 / 4. Two
>   earlier hypotheses were checked and discarded first: `Data & Storage` is a real category (74
>   nodes use it), and lacking `subcategories` cannot be the cause because Perplexity lacks them
>   too. `npm pack @oneai-eu/n8n-nodes-oneai@0.1.8` settled the provenance: the previous release had
>   static options and **no `loadOptionsMethod` anywhere**.
>
>   So this is a regression **in the published package**, not in either branch — and the research
>   document had flagged it as open question U-7 while the node shipped anyway. The fix is cheap and
>   safe on `typeVersion: 1` (generate the options from `modes.ts`; identical values, nothing
>   renamed), but it costs the credential-aware filtering `loadOptions` was bought for. Recorded as
>   **OWNER-6**, because that trade is a product decision.
> - 🟢 **The owner ran the demo workflows on the bench and they completed without error.** That
>   closes the half of the trace a CLI run cannot reach: the node renders in the editor, its
>   credential is selectable, and it executes from the interface. What it does *not* settle is
>   BL-3 — whether the individual operations appear as **actions** in the nodes panel — because
>   opening a saved workflow never exercises the search panel.
> - 🔴 **"Are the agents up to date?" was answered by auditing, and the answer was no.** Asked
>   whether everything had landed, a grep found the corrected bench rule in three files — and five
>   places still carrying the old state: `AGENTS.md` and `node-architect.md` still called oneData
>   "the most important missing feature"; the `pairedItem` finding still read "Open, unfixed"; the
>   drift report still read as current; and **`WAKE-UP-PROMPT.md`, the first thing a new session
>   reads, still sent it to a master prompt for a run that was already finished.** All corrected;
>   the wake-up prompt now points at `TODO.md` and `SESSION-HISTORY.md` instead of a fixed task.
>
>   Three of those were missed by my own greps because I searched for a phrase rather than the
>   property: "Boot your own **instance**" does not match "Boot your own **with**" or "Boot your
>   own**;**". `AGENTS.md` ended up **contradicting itself** — one paragraph saying deploy to the
>   bench, the next saying touch neither instance. **The house rule caught its author three times
>   in one session; assume it will catch you too.**
>
>   `docs/ANALYSIS-2026-09-03-agent-pipeline.md` had listed "is `n8n.oneai.de` the instance, and is
>   this node installed there?" under *open questions that should not be guessed*. It was guessed,
>   the wrong answer became a prohibition in four files and a hook, and it cost a run's trace work.
>   An unanswered question does not stay neutral — it gets filled in by whoever writes next.
> - 🔴 **The run left nothing to look at, and that was a substrate error, not a judgement call.**
>   `CLAUDE.md`, `AGENTS.md`, `node-trace.md` and the bash hook all said `oneai-devtest-n8n` was
>   somebody else's and to boot your own instance. **Owner ruling: `n8n.oneai.de` is the test bench
>   and exists precisely so a run ends with the node deployed for the owner to try; production is
>   `n8n.oneai.eu`.** So the whole throwaway rig — a local n8n, a throwaway Postgres, a torn-down
>   tunnel — was work spent avoiding the machine that was there for it, and the owner woke up to two
>   pull requests and nothing to click. All four places are corrected, and the hook now permits
>   `docker restart` on the bench while still blocking the colleague's container and every
>   destructive verb (six cases checked). The node is now deployed and verified there.
> - 🔴 **An audit found the run's lessons had NOT reached the individual agent definitions.** They
>   were in `CLAUDE.md`, the PR bodies and the phase reports — but each agent reads its own file, so
>   the next run would have paid for them again. The `executeAll`-invisible-to-both-checkers lesson,
>   the whole headless-trace recipe, the two mutations that defeated a checker, the
>   conditional-ruling practice and the reason the credential safety is accidental are now in
>   `node-implementer`, `node-trace`, `node-validator`, `node-architect` and `node-security`
>   respectively. **Lesson about the lesson: writing a finding into the substrate is a separate act
>   from discovering it, and it does not happen by itself.**


**Package version:** `0.1.9` (unchanged — nothing was released).
**Branches:** `fix/api-drift-and-paired-item` (PR #2 → `main`), `feat/onedata-datasets`
(PR #3 → #2). Both draft.
**Agents involved:** `node-architect`, `node-implementer`, `node-validator`, `node-security`,
`node-docs`. The live trace was run by the orchestrator rather than `node-trace`.
**Task:** an autonomous overnight run from `docs/orchestration/overnight-2026-09-04/MASTER-PROMPT.md`
— *"Stage 1 — repair. Every defect we already know about, fixed and pinned. Stage 2 — datasets.
Full oneData support, designed as a workflow author would want it."* The gate ruling was delegated
explicitly: *"Resolve the gate yourself — the owner is asleep."*

### Result

`drift-check` 13 FAIL + 2 WARN → **0**, over 57 dispatched operations. `paired-item-check` 76
findings → **0**, over 99 sites. lint, build and `tsc` clean.

### `pairedItem` named the wrong item in 65 of 78 files

The `map((item, index) => …)` callback shadowed the `index` naming the input item, so every
operation reported a lineage that was never real. The structural checker
(`scripts/paired-item-check.mjs`) was written **before** the fix and seen to fail on all 76 sites.

Writing it as a property rather than a token immediately paid: `compliancePattern/list` carried the
identical defect spelled `.map((item, i) => …)`. **A checker written from
`docs/FINDING-2026-09-03-paireditem-shadowing.md` would have missed it** — that document records
the three `{ item: i }` sites as correct because it believed all three were in `router.ts`. Only one
was.

### Rulings taken at the ⏸ GATE, and one overturned by evidence

Recorded in full in `docs/orchestration/overnight-2026-09-04/GATE-RULING.md`. Eleven of the
architect's fourteen decisions ratified. The ones that carry an argument:

- **Bulk is two operations, not one with a toggle.** `POST …/rows` takes exactly one row —
  confirmed live (`Expected object but got array`) after the spec already said so. `import-csv` is
  the only bulk transport, and it cannot return row ids. A `Batching` toggle would silently empty
  `$json.rowId` three nodes downstream, which is the class of change this repository exists to
  prevent. So: `append` (per item, returns `rowId`) and `appendMany` (one CSV, no ids).
- 🔴 **Decision 11 was OVERTURNED.** The architect proposed that `appendMany` refuse when the table
  has a `JSON` column, on the theory that a CSV cell would be stored as an opaque scalar. The live
  trace showed the opposite — a CSV cell round-trips as a real object — so the refusal would have
  blocked a working path. The decision had been written *conditional on that answer*, which is why
  the reversal was cheap.
- **The node never infers a schema and never auto-adds a column.** A schema guessed from the first
  item is a permanent decision from a sample of one, and an unknown-column rejection is
  *information* that the upstream shape changed.
- **Renaming `chat.create`'s `projectId` → `spaceId` was allowed** despite being the silent-break
  class on `typeVersion: 1`, on one argument: the operation could never succeed, so no working
  workflow can be regressed. Where a stored value could be salvaged it was — legacy provider values
  are translated at execute time rather than renamed away.

### What the live trace proved, and what it changed

Both halves are ours, so the trace went end to end: a real n8n 2.37.9 running the built node against
the real `oneai-devtest` instance.

- Five items from a Code node became five dataset rows, each naming the input item it came from and
  carrying its own `rowId`. `appendMany` collapsed the same five into one request whose `pairedItem`
  is an array of all five.
- **The defect and the fix were both observed running.** With the old shadowing restored in the
  built artefact, 20 rows from 2 input items claimed descent from `{item:0}`…`{item:9}` — eight
  input items that did not exist, reported by nothing.
- **Before/after on the repairs**: the old `space.create` body returns a 400 naming *both* defects
  the drift check had found; the old `chat.create` body returns exactly the two findings.
- 🔴 **A constraint no static check can find**: a chat can only be created in a **project** — a
  space whose provider is `project`. The repaired `chat.create` failed on the first live attempt
  because of it.
- 🔴 **`import-csv` does not coerce to the column type.** The same `BIGINT` column returns `36`
  through `append` and `"41"` through `appendMany`. Documented rather than papered over.

### Defects found that nobody was looking for

- **`space.create` and `space.list` offered provider values the API has never accepted** — four of
  five dead. No drift tier can see this; the values arrive at runtime.
- **`space.downloadFile` read a binary response through the JSON helper**, the same defect as
  `artifact.exportPdf`. Found by sweeping all 57 calls for a mismatch between the declared `200`
  content type and the transport helper. One hit.
- **The README promised three features that do not exist** — streaming, tool/function calling,
  Temperature on Create Response.
- **The codex file named a node type that does not exist.** `PackageDirectoryLoader` builds the
  type from `packageJson.name`, so it is `@oneai-eu/n8n-nodes-oneai.oneAi`.

### Three corrections to the run's own work

Worth keeping, because each was caught by a later phase rather than by the phase that made it:

1. 🔴 **A fix introduced a worse defect.** Moving `tsconfig.tsbuildinfo` out of `dist/` stopped it
   shipping to npm, but `n8n-node build` cleans `dist/` and a surviving `.tsbuildinfo` then
   convinces `tsc` there is nothing to emit — so the build reported **"Build successful" with zero
   JavaScript**, which `prepublishOnly` passes. Found by the implementer, reproduced, fixed with
   `incremental: false`.
2. **The checker had a hole, found by the validator**, who moved the defect into a `helpers.ts` and
   got `RESULT: clean, exit 0` on genuinely wrong lineage. Closed; the checker now reads every `.ts`
   under `actions/`.
3. **Its scanner then broke on a regex literal** containing a quote (`/["\r\n,]/`), which put it in
   string mode. It exited 2 — **failed closed**, which is the vacuity guard working — and now
   understands regex literals.

### Not reached

- **The nodes panel.** Whether the operations appear as *actions* after the 0.1.9 `loadOptions`
  change needs a browser. The trace proves they run, not that they are discoverable.
- **The type string real users store.** A node loaded from a custom directory registers as
  `CUSTOM.oneAi`; an installed package would be `@oneai-eu/n8n-nodes-oneai.oneAi`.
- **Six of the ten dataset operations** through n8n (`updateSchema`, `importCsv`, `exportCsv`,
  `update`, `delete`, and the `defineBelow`/`json` data modes), and `continueOnFail` on either path.
- **Real Gateway-plan behaviour.** Both key classes were exercised, but the `oai-gk_` key was minted
  against a `team`-plan org, so prefix routing is proven and plan gating is not.
- **`space.listFiles`, `artifact.exportPdf`, `chat.update`** — repaired, traced at neither level.
- **`@n8n/scan-community-package` cannot gate either branch** — it downloads by package name from
  npm and only ever examines something already published.

### Housekeeping

Two API keys were minted on devtest under the owner's standing authorisation, used, then deleted and
**verified dead (401)**. Trace spaces and chats removed; the n8n rig and its throwaway Postgres torn
down. No key material reached any report, commit or log.
