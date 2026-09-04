# n8n-nodes-oneai — Session History

> Append-only log. Newest at top. Maintained by the `node-docs` agent as the last phase of a run.
> Line count grows monotonically: correct a past entry by adding a note to it, never by deleting it.
>
> **What belongs here:** what was decided and **why**, what was overturned, what a live trace
> actually proved, and what was **not** reached. The diff says what changed; this says why anyone
> chose it. **What does not belong here:** phase reports and orchestration prompts — those stay
> untracked in `docs/orchestration/` — and never a credential, a key or a host password.

---

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
> - 🟢 **The owner ran the demo workflows on the bench and they completed without error.** That
>   closes the half of the trace a CLI run cannot reach: the node renders in the editor, its
>   credential is selectable, and it executes from the interface. What it does *not* settle is
>   BL-3 — whether the individual operations appear as **actions** in the nodes panel — because
>   opening a saved workflow never exercises the search panel.
> - 🔴 **"Are the agents up to date?" was answered by auditing, and the answer was no.** Asked
>   whether everything had landed, a grep found the corrected bench rule in three files — and five
>   places still carrying the old state: `AGENTS.md` and `node-architect.md` still called OneData
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
Full OneData support, designed as a workflow author would want it."* The gate ruling was delegated
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
