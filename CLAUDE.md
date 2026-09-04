# n8n-nodes-oneai — Claude Code Instructions

The oneAI community node for n8n. **A published, certified npm package** that other people install
into their own n8n instances.

🔴 **Do not carry oneAI's rules over.** This repository looks like the oneAI platform repository and
almost every hard rule is different. The table below is not trivia — it is the list of habits that
will do the wrong thing here.

| | oneAI platform | **here** |
|---|---|---|
| Host | Forgejo — **`gh` does not work** | **GitHub — `gh` is the right tool** |
| Draft PRs | a `WIP: ` title prefix by convention | native: `gh pr create --draft`, `gh pr ready` |
| Gates | `pnpm format && check && typecheck`, vitest | **`n8n-node lint` / `n8n-node build`** |
| Blast radius | internal deployments | 🔴 **the public npm registry** |
| Type source | `src/openapi.gen.ts` in-repo | oneAI's `openapi.json` — see below |
| Threat model | tenants, multi-tenancy, confirmation bypass | **workflow authors and instance operators** |

---

## 🔴 How this package actually reaches the public — read before touching anything release-shaped

`.github/workflows/publish.yml`:

```yaml
on:
  release:
    types: [created]
…
      - run: npm publish --access public --provenance
```

**Creating a GitHub Release publishes to npmjs.org.** Not a tag — a *release*. `git tag v0.2.0` on
its own does nothing; `gh release create` (or the button in the UI) runs the workflow, and the
version it publishes is whatever `package.json` says at the tagged commit. That is why the owner's
instruction is "stable tag **and** update package.json": the tag decides *which code*, `package.json`
decides *which version*, and a version that already exists on npm makes the publish fail rather than
overwrite.

Three consequences that change how you work here:

**1. The dangerous command is `gh release create`, not `npm publish`.** A guard on `npm publish`
alone protects a door nobody uses. The hook refuses release creation, tag pushes, `npm publish`,
`npm version` and `npm dist-tag`. That refusal is not an obstacle to route around — a release is the
owner's, always.

**2. There is no npm token to revoke.** Publishing uses **OIDC trusted publishing**
(`id-token: write`, `--provenance`, and no `NODE_AUTH_TOKEN` anywhere in the workflow's history).
The control surface is *who may create a release in this GitHub repository* — nothing else. It also
means the provenance attestation that n8n's verification depends on is produced here, so **staying
on GitHub is a technical requirement**, not a habit.

**3. 🔴 The publish path is not reproducible, and it is the only gate.**

| | |
|---|---|
| gates that run | `prepublishOnly` = `npm run build && npm run lint`, during `npm publish` |
| gates that do **not** run | tests, the drift check, `@n8n/scan-community-package` |
| **`package-lock.json` IS committed** | CI runs `npm ci`. It used to be `.gitignore`d, which an earlier analysis called "a deliberate act, not an oversight" — the history does not support that: the line arrived in a large feature commit alongside `pnpm-lock.yaml`, with no rationale, and reads as a generic ignore rather than a decision about reproducibility |
| `npm install -g npm@latest` | npm itself is unpinned in the publish job |

`files: ["dist"]`, so the published artefact is built *in that job* from dependencies resolved that
minute. The package has **zero runtime dependencies**, so this bites through devDependencies —
`typescript`, `@n8n/node-cli`, `eslint` — which are exactly what *builds* `dist/`. What ships is
therefore not provably what anyone tested.

Improving that (a lockfile, `npm ci`, the drift check and the scanner in CI) is a **proposal to the
owner**, not an agent's edit: changing the publish path is itself a release-affecting act.

Second: **never push to `main`, and never take a PR out of draft.** Owner rule — draft pull requests
only, in English, **with no AI attribution of any kind** (no `Co-Authored-By`, no 🤖, no "Generated
with", no session link) in commits, PR bodies or files.

---

## Two version numbers, and only one of them protects anyone

🔴 The single most important fact in this repository.

| | what it is | effect on an existing workflow |
|---|---|---|
| **package version** (whatever `package.json` says) | npm semver, read by the operator who upgrades | **none directly** — the upgrade replaces the code every existing workflow runs |
| **node `typeVersion`** (`version` in `OneAi.node.ts`) | stamped into every saved workflow node | **everything** — the only thing that pins old behaviour |

Our node declares `version: 1` as a **plain number**, so every oneAI node anyone has ever placed is
saved as `typeVersion: 1`. Bumping the package from `0.1.8` to `0.1.9` created no new node version —
it silently replaced the code behind `typeVersion: 1` on every instance that upgraded.

`VersionedNodeType.getNodeType(version)` is a **bare map lookup with no fallback**, so:

> A `typeVersion` that has ever been saved into a user's workflow must remain a key in `nodeVersions`
> for the life of the package. Remove it and the loader returns `undefined` for that node.

**What is safe, what breaks** (derived from `n8n-workflow` source, research §3):

- adding an operation, adding an optional parameter — safe
- changing a request body we send — internal, safe
- renaming an **operation** — breaks at runtime with our own `Unknown operation:`
- 🔴 renaming a **parameter** — breaks **silently**. `getParameterIssues` never validates option membership, so nothing is reported; the workflow simply does something else.

**Owner ruling:** avoid breaking workflows where avoidable, but **never at the cost of features.**
The way to have both is n8n's own: move to `VersionedNodeType`, keep `1` forever, and let several
`typeVersion`s share one implementation class — HTTP Request ships `1, 2, 3, 4, 4.1 … 4.5` where
`4`–`4.5` are all `HttpRequestV3`. That is how a breaking change becomes affordable rather than
forbidden.

---

## Types come from oneAI's OpenAPI spec

**Owner/Oli rule: follow the spec's types strictly. No `as any`. Do not reach for `unknown` either —
derive the real type.**

The code satisfies this literally today (`as any`: 0, `: any`: 0, `tsconfig` strict). The gap is
elsewhere and a grep for `any` will never find it:

- 🔴 **`IDataObject` is how untyped payloads actually enter this codebase.** It is n8n's own loose
  record type and cannot be banned outright — a row whose columns belong to the workflow author
  genuinely is one. Count it before you argue about it, never from memory:

  ```bash
  grep -ro "IDataObject" nodes/ credentials/ --include=*.ts | wc -l
  grep -rn "as any\|: any\b" nodes/ credentials/ --include=*.ts | wc -l   # must stay 0
  ```
**The spec is now committed** at `openapi/openapi.json` (325 paths / 401 operations) with an
`openapi/PROVENANCE.md` naming the oneAI commit it was taken from and its SHA-256. Without that
provenance every future drift report is unfalsifiable — "measured against which checkout?" has no
answer.

Still open: **generating types from it**, the way the platform generates `src/openapi.gen.ts`. Until
that exists, "follow the types" is a habit a reviewer must police rather than a property the compiler
enforces.

### Drift is checked on shapes, not paths

Oli's rule: *after implementing anything, go through the rest of the node and check it against the
spec — request bodies change.*

A path-level check is not enough. An endpoint whose path is unchanged but whose body renamed a field
passes it and fails at runtime. `scripts/drift-check.mjs` compares **method, path and request shape**
across the whole surface, and it runs over everything, not only what was touched.

🔴 **It compares requests only, and the response is the standing blind spot.** Two real defects lived
there: `artifact:exportPdf` and `space:downloadFile` both read an `application/octet-stream` endpoint
through the JSON transport helper. Tier 1 passes (the path resolves), tier 3 passes (there is no
request body), lint and `tsc` have nothing to say. Until a response tier exists, sweep for it by hand
after touching the surface — compare each call's declared `200` content type against the transport
helper it uses; `oneAiApiRequestRaw` is the binary one.

### 🔴 Two ways to make this node invisible in the nodes panel

Both shipped. Both were found by a person typing "oneai" into a real n8n and getting nothing —
`lint`, `build`, `tsc` and both structural checkers were green throughout, because none of them
asked the question a user asks. `node scripts/panel-check.mjs` now does.

1. **`resource` / `operation` from `loadOptions`.** n8n's node creator is **action-first**: it builds
   a node's panel entries from the **static `options` arrays** of those two parameters and from each
   operation's `action` string. `loadOptions` is evaluated only once a node is already on the canvas,
   so the node produces **zero actions**. Measured: this node 0 options / 0 actions, Slack 7 and 17
   options / 7 actions, Perplexity 1 and 1 / 4. `0.1.9` shipped exactly this.
2. 🔴 **`"AI"` in the MAIN node's codex `categories`.** It routes the node into the AI branch of the
   creator, where the `*Tool` variants live, and it vanishes from the search. n8n generates
   `oneAiTool` from `usableAsTool: true` and gives **that** `categories: ["AI"]` by itself — which is
   where an AI Agent looks. Removing "AI" from the main node is what made it appear again, live.

   Honest limit: cause 2 was the decisive change. Whether cause 1 alone also hides a node was never
   tested in isolation — "zero actions AND no AI category" is an untried state. Both rules are
   enforced because both are independently right, not because both are proven necessary.

**Discoverability is not a property the repository can see.** Nothing in a build or a diff reveals
it; only a browser does. Treat "the owner found it in the panel" as the acceptance test, and keep
`panel-check.mjs` as the thing that stops the two known causes coming back.

### Facts about the API that no check can find

Constraints the OpenAPI schema does not express, so no tier of any checker will ever report them.
Each cost a live request to discover; add to this list rather than rediscovering it.

- 🔴 **A chat can only be created in a *project*** — a space whose `provider` is `project`. The
  schema says only "Space ID to create the chat in". Any other space is rejected with
  `Chats can only be created in projects.` The caller's `personalProject` is accepted; their
  `personalSpace` is not.
- 🔴 **`import-csv` does not coerce cells to the declared column type.** The same `BIGINT` column
  returns `36` when written through `POST …/rows` and `"41"` when written through `import-csv`. A
  workflow doing arithmetic on it gets a number from one path and string concatenation from the
  other. The node states this rather than coercing client-side — guessing types on the way through
  is how a node starts corrupting data.
- **`GET /api/chats` returns `totalChats` unfiltered** beside a filtered `chats` array. Only
  `hasNextPage` is safe to paginate on there.
- **`POST …/rows` takes one row.** `{ data: [ … ] }` is rejected with
  `Expected object but got array`; the plural `ids[]`/`inserted` in its response is a shape shared
  with the bulk CSV endpoint, not evidence of bulk capability.

---

## 🔴 Presence is not correctness

The rule this repository exists to remember, and the case that taught it.

`pairedItem` was set in **every** operation and pointed at the wrong item: the
`map((item, index) => …)` callback shadowed the `index` parameter naming the input item, so rows
reported a lineage that was never real. Every check for the *token* was green on all of them. n8n's
own guidance snippet carries the same shadowing and we had adopted it verbatim.

The defect is fixed and `scripts/paired-item-check.mjs` now enforces the property. **The rules below
outlive the defect** — they are why that checker resolves scopes instead of matching text, and they
belong in every validator rule written here:

1. **Assert the property, not the token.** "`pairedItem` is set" passes on every broken file.
   "`pairedItem` names the input item this row came from" does not.
2. **The token is not always spelled the same.** The identical defect also appeared as
   `.map((item, i) => ({ pairedItem: { item: i } }))`. A checker written from a *description* of the
   bug missed it; one that resolves bindings did not care what the variable was called.
3. **A snippet from an authority is evidence about a shape, not a licence to skip thinking about our
   own case.** Theirs is right for one-input-to-one-output; most of our operations return many rows
   from one item.
4. **Measure `origin/main`, never a stale checkout.** Two analyses reported the wrong thing because
   the local tree was four commits behind and npm `latest` was two releases ahead.
5. **A finding document is evidence, not scripture.** The write-up of this defect recorded three
   `{ item: i }` sites as *correct* on the grounds that they were all in `router.ts`. Only one was.
   Re-measure what a document asserts before you build a check on it.

**Both halves were observed running**, which is the standard to hold a fix to: with the defect,
20 rows from 2 input items claimed descent from `{item:0}`…`{item:9}` — eight input items that did
not exist, reported by nothing. With the fix, ten rows named item 0 and ten named item 1.

---

## Project structure

```
nodes/OneAi/
  OneAi.node.ts          the node description; `version`, `usableAsTool`, the property list
  OneAi.node.json        the codex file (categories, docs links)
  actions/
    router.ts            loops the INPUT ITEMS and dispatches resource+operation
    <resource>/
      *.operation.ts     one file per operation: description + execute()
      index.ts
      helpers.ts         shared shapes for a resource, where one exists
  transport/index.ts     the single HTTP seam — httpRequestWithAuthentication only
  modes.ts               the resource/operation registry
credentials/OneAiApi.credentials.ts
openapi/openapi.json     the committed spec snapshot; PROVENANCE.md names its oneAI commit
scripts/drift-check.mjs        spec ↔ node surface, on shapes
scripts/paired-item-check.mjs  every emitted row names the input item it came from
scripts/panel-check.mjs        the node is findable in the panel, and the build can emit at all
docs/                    research, findings, orchestration — never shipped
```

🔴 **Operation files are commented out of both `router.ts` and the node.** They are in the
repository, no lint rule sees them, and **any check that counts files instead of the shipped surface
counts them**. Never state the surface from memory or from a directory listing — ask the tool, which
parses the router:

```bash
node scripts/drift-check.mjs | head -6      # resources, dispatched operations, API calls
```

Hand counts of this surface have been wrong three times (67, then 51, then 49-vs-51), always in the
same direction: too high, because they counted files.

---

## Gates

```bash
npm run lint          # n8n-node lint — n8n's own rule set
npm run build         # n8n-node build
npx tsc --noEmit      # strict, noImplicitAny
node scripts/drift-check.mjs        # spec ↔ shipped surface, on shapes
node scripts/paired-item-check.mjs  # lineage: every row names the input item it came from
node scripts/panel-check.mjs        # can a workflow author FIND the node in the panel?
```

All three `scripts/*.mjs` checks exit **1** on a real finding and **2** when their own extractor is
broken. A 2 means every number they printed is fiction — it is never a finding.

🔴 **`incremental` is off in `tsconfig.json`, and must stay off.** `n8n-node build` deletes `dist/`
and then runs `tsc`; a surviving `.tsbuildinfo` convinces `tsc` everything is already emitted, so the
build prints **"Build successful" and produces no JavaScript at all**. `prepublishOnly` is
`build && lint` and is the only gate on the publish path, so it passes on that empty artefact.
`panel-check.mjs` R4 asserts the setting is off, but the assertion reads `tsconfig.json` and cannot
see an empty `dist/`, so after any change to build configuration also check that the build actually
emitted something:

```bash
rm -rf dist && npm run build && find dist -name '*.js' | wc -l   # must be non-zero
npm run build && find dist -name '*.js' | wc -l                  # and again on a warm tree
```

`.mjs` and not `.ts` on purpose: this repository has no lockfile and a fresh clone has no
`node_modules`, and CI pins Node 22 where type-stripping a `.ts` entry point is not dependable. A
checker that silently stops running is worth less than none.

### 🔴 `@n8n/scan-community-package` — what it is, and three things that are not obvious

Run 2026-09-03 for the first time. **`@oneai-eu/n8n-nodes-oneai@0.1.9` passes all security checks.**

```
npx @n8n/scan-community-package @oneai-eu/n8n-nodes-oneai
```

1. **It takes a package NAME, not a path.** Given a directory it fails with
   `Cannot read properties of undefined (reading 'latest')` while calling the target `.@null`. It
   downloads the package **from npm**, verifies its provenance against GitHub, and analyses that.
2. **So it cannot gate local code.** It only ever examines something already published — it is a
   post-publish verification, not a pre-release check. Anything that must be caught *before* a
   release has to be caught by lint, the drift check or a test.
3. 🔴 **Its exit code is 0 even when it fails.** The failing run above printed
   `❌ Package … has failed security checks` and still exited **0**. A CI step gating on the exit
   code would pass on failure. **Parse the output for `✅`/`❌`; never trust the status.**

**There is no unit-test convention in n8n**, and n8n's own testing page amounts to "run it in a local
n8n, and lint it". vitest is anticipated by the rule docs, so structural tests are permitted — and
they are what catches the `pairedItem` class, which neither lint nor a happy-path trace will show.

---

## Live trace

Both halves are ours, so a trace can be end-to-end and real.

- `n8n-node dev` compiles the node and boots a **local** n8n with it — the supported path, one
  command. (Manually: `npm run build` → `npm link` → `npm link <package>` in `~/.n8n/custom` → `n8n start`.)
- 🔴 **Deploy into `n8n.oneai.de` — that is what it is for.** Owner ruling 2026-09-04: it is the
  **test bench**, stood up so that a development run ends with the node *running* somewhere the
  owner can open it the next morning and try it. A run that leaves only pull requests is half
  finished. The container is `oneai-devtest-n8n`, and it already carries
  `@oneai-eu/n8n-nodes-oneai` as an installed **community package**, so a deployment there exercises
  the real node type `@oneai-eu/n8n-nodes-oneai.oneAi` — not the `CUSTOM.` name a linked directory
  gives you.
- 🔴 **Production is `n8n.oneai.eu`, a different machine. Never touch it.** And
  `oneai-devtest-n8n-ralf` is a colleague's: never stop, restart or remove it. Never run
  `docker compose … --remove-orphans` on that host — it deletes containers that are not in the compose file and
  has destroyed n8n there before. `docker restart oneai-devtest-n8n` is allowed and is part of
  deploying; `stop`, `kill` and `rm` are not.
- oneAI to trace against: **devtest**, the `oneai-devtest` container on the same host, reachable
  from the n8n container as `http://oneai-devtest:3000`.

**Owner authorisation (2026-09-03):** generate whatever credentials a trace needs on devtest —
a **user API key** and a **gateway API key**. Both classes matter because they are validated
differently: `oai_` against the hub via `/api/auth/check`, `oai-gk_` against the oneAI Gateway. A
trace that exercises one leaves the other unproven.

Credential discipline: never print a key, never let one reach a report, log, fixture or commit.
Delete throwaway credentials and **verify the deletion** — but a credential left in place on the
bench so the owner can actually use the instance is **not** a leak, it is the point. The owner has
authorised one to persist under their account; label it so it is identifiable and revocable, and say
in the report that it persists.

🔴 **Delete test DATA before credentials.** Removing the key first locks you out of the API you need
in order to clean up, and the recovery is minting another one.

---

## What belongs in the node

**Not API coverage. Composability.** The measure is what a workflow author can build *with the rest
of n8n* that was impossible before — this node's worth is as a junction in a graph, not as a mirror
of an API. "14% of 409 endpoints" is not a deficiency to close.

The worked example, from Oli, and it is the standard to judge the next feature by: **oneData
(datasets / tables)** was the most important missing capability, because hundreds of other n8n nodes
can pull data out of other apps and this node is what lands it in a oneAI dataset. It now ships —
resources `dataset` and `datasetRow` — so use it as the shape of a good answer, not as an open item.

Core surface named by the owner: **Chatting (very important)**, Spaces, Datasets, Audit Logs.

**Out of scope by instruction:** sign-in, sign-up, OAuth — the node authenticates with an API key.
That settles `auth`, `passkeys`, `subscription`/Stripe and `scim` without further discussion.

---

## Authority order

1. **Oli and the owner** — `docs/N8N-DEV-FEEDBACK-*.md`. Where these and the public docs disagree, these win.
2. **n8n's own shipped nodes** — `n8n-io/n8n`, `packages/nodes-base/nodes`. Shipped code beats prose; it is what the team maintains.
3. **n8n documentation** — `docs.n8n.io/connect/create-nodes/…`. 🔴 The older `…/integrations/creating-nodes/…` paths are redirects.
4. Everything else is `INTERPRETED` at best.

🔴 **Read `nodes-base`; never vendor it.** On 2026-09-03 we removed 18 648 lines of third-party
source from the oneAI repository — four files of n8n node source among them — because foreign code
under a foreign licence does not belong in our tree, on a branch or in a PR. Cite it by URL and
commit; archive anything you need outside the repository.

---

## Reference documents

| | |
|---|---|
| `docs/RESEARCH-2026-09-03-n8n-node-development.md` | the evidence base: versions, package bars, versioning, credentials, lint, triggers. Every claim classed and sourced |
| `docs/FINDING-2026-09-03-paireditem-shadowing.md` | the `pairedItem` defect — **closed**, and kept because the reasoning is the house standard. Read it with §"Presence is not correctness": three of its claims about which sites were correct did not survive re-measurement |
| `docs/N8N-DEV-FEEDBACK-certification.md` | n8n's three certification items — **closed**, kept as guidance |
| `docs/N8N-DEV-FEEDBACK-oli-agent-guidance.md` + `ANALYSIS-…` | Oli's rules, checked against the code |
| `TODO.md` | the living state: what is open, what needs the **owner's** ruling, what is closed. Stable IDs, never renumbered |
| `SESSION-HISTORY.md` | append-only, newest first: what each run decided and **why**, what it overturned, and what it did not reach |
| `.claude/agents/AGENTS.md` | the agent set and how a run is orchestrated |

Phase reports and orchestration prompts are **working material, never committed** — the same rule the
platform repository learned the hard way.
