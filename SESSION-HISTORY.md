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
