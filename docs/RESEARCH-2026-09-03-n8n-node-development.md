# How a community n8n node is built, versioned, tested and certified — and where `@oneai-eu/n8n-nodes-oneai` stands

**Run date:** 2026-09-03 · **Status:** research only. No code changed, no `package.json` touched, nothing decided.
**Purpose:** the factual basis for an agent set (architect / implementer / validator / security / trace / docs), a
`CLAUDE.md` and an orchestration template for `/root/n8n-nodes-oneai`.

---

## Evidence discipline

Every claim in this document carries a class and a source. This is the same apparatus the connector pipeline uses.

| Class | Meaning | May it establish a requirement? |
|---|---|---|
| `DOC-LITERAL` | Quoted verbatim from n8n's own documentation, source or registry metadata, with URL + the version/tag it was read at. | **Yes** |
| `INTERPRETED` | Derived, inferred, or read off an example. Includes anything from a blog post or third-party tutorial. | **No** |
| `UNKNOWN` | Looked for, not settled. Listed in §8. | **No** — and an agent must not paper over it |
| `LOCAL-FACT` | Read directly out of `/root/n8n-nodes-oneai` or the published npm tarball. About *us*, not about n8n. | Yes, about our node only |

**The documentation corpus was pinned.** All `DOC-LITERAL` quotes below come from the `n8n-io/n8n-docs`
repository at **`main` = `6f4b48e69e3ab9acbf023f18020c40c125c16d45`, committed `2026-09-03T16:02:31Z`** — i.e. the
same day as this run. Raw markdown was downloaded rather than the rendered site, so quotes are the source text.

🔴 **The docs moved.** As of this corpus the node-building documentation lives at
`docs/connect/create-nodes/…` (published under `https://docs.n8n.io/connect/create-nodes/…`), **not** the
`docs/integrations/creating-nodes/…` path that older tutorials, older agent prompts and most of the web still cite.
Every page carries an `originalUrl:` front-matter key pointing at the old location, so the old URLs are aliases,
not the canonical path. Any agent prompt that hardcodes `docs.n8n.io/integrations/creating-nodes/...` is citing a
redirect.

---

## §0 · Versions this run is anchored to

Read from `registry.npmjs.org` on 2026-09-03. `DOC-LITERAL` (registry metadata is the publisher's own statement).

| Package | Version (`latest`) | Notes |
|---|---|---|
| `n8n` | **2.37.9** | `engines.node` = `>=24.0.0`. n8n is on a **2.x** major line. |
| `n8n-workflow` | **2.16.0** | The peer our node declares as `"*"`. |
| `n8n-core` | 2.16.1 | |
| `@n8n/node-cli` | **0.46.3** | provides the `n8n-node` binary; `engines` field absent; peer `eslint >= 9` |
| `@n8n/create-node` | 0.46.1 | the `npm create @n8n/node` initializer |
| `@n8n/scan-community-package` | **0.34.0** | "Static code analyser for n8n community packages" |
| `@n8n/eslint-plugin-community-nodes` | 0.31.0 | pulled in by `node-cli` (which pins `0.30.0`) |
| `eslint-plugin-n8n-nodes-base` | **2.0.0** | pulled in by `node-cli` (which pins `^1.16.7`) |
| `@oneai-eu/n8n-nodes-oneai` | **0.1.9**, published `2026-07-16T13:57:32Z` | our package |

`@n8n/node-cli@0.46.3` declares these as direct dependencies (`DOC-LITERAL`, registry):
`eslint 9.29.0`, `prettier 3.6.2`, `typescript-eslint ^8.35.0`, `eslint-plugin-n8n-nodes-base ^1.16.7`,
`@n8n/eslint-plugin-community-nodes 0.30.0`, `@n8n/ai-node-sdk 0.27.3`, `ts-morph ^27.0.2`, `handlebars`,
`@oclif/core ^4.5.2`, `@clack/prompts`.

Two of those are worth flagging now and are picked up later:

- **`@n8n/ai-node-sdk@0.27.3` is a dependency of the node CLI.** There is an AI-node SDK in the toolchain that
  did not exist when our node was written. What it is for is `UNKNOWN` (§8, U-1).
- **`eslint-plugin-n8n-nodes-base` has gone 2.0.0** while `node-cli` still pins `^1.16.7`. The lint rules our
  `n8n-node lint` runs are therefore the **1.x** rule set, not the newest published one.

---

## §0.1 🔴 · Baseline correction: our node is not what the brief says

`LOCAL-FACT`. The brief for this run described the node as *"v0.1.8, last commit 2026-03-24"*. That describes the
**local working copy**, which is four commits behind its own remote.

```
HEAD (local main)   629351c  "Update README…"                      → v0.1.8, 2026-03-24
origin/main         aef3e2e  "Fix lint errors for release"         → v0.1.9, tagged v0.1.9
  ↑ aef3e2e  Fix lint errors for release
    3758eba  Upgrade version from 0.1.8 to 0.1.9
    86ff1a4  Rebrand display text from "OneAI" to "oneAI"
    181b1a9  Add Gateway Only mode, new AI operations, and compliance patterns
```

`@oneai-eu/n8n-nodes-oneai@0.1.9` is **on npm as `latest`, published 2026-07-16**, and its tarball matches
`origin/main`. The published artifact contains a file (`dist/nodes/OneAi/modes.js`) that does not exist in the
local checkout at all.

This is exactly the failure the platform's own note
`reference_worktree_local_branch_is_stale_after_server_side_merge` warns about, and it changes several conclusions
below. **Every agent prompt built from this research must open with `git fetch && git status` against
`origin/main`, and the "what our node does today" column must be read from `origin/main`, not the working copy.**

### What actually changed in 0.1.9

`LOCAL-FACT`, read from `git show origin/main:…` and the npm tarball:

1. **A `modes.ts` registry was introduced** (`nodes/OneAi/modes.ts`, 193 lines) holding `RESOURCES` (8 entries)
   and `OPERATIONS` (**51 operations**), each carrying a `gateway: boolean`.
2. **Resource and Operation became dynamic dropdowns.** In `OneAi.node.ts` on `origin/main` the two top-level
   properties are now named `'Resource Name or ID'` and `'Operation Name or ID'` and are populated by
   `loadOptions` methods that filter on a new credential field `gatewayOnly`. They are no longer static
   `options` arrays. **This is the single most consequential change in the node and §2.3 and §7.3 return to it.**
3. **A `compliancePattern` resource** was added (5 operations, EU AI Act content policies).
4. **New AI operations**: `createEmbedding`, `editImage`, `generateImage`, `generateSpeech`, `listImageModels`,
   `transcribeAudio` alongside the existing `createResponse` / `listModels`.
5. **Display-name rebrand** `OneAI` → `oneAI` (the node's `displayName`, `defaults.name`, `description`, package
   `description` and `author.name`). The internal `name: 'oneAi'` was **not** changed — correctly (§3.4).
6. **Toolchain bump**: `@n8n/node-cli` `"*"` → `^0.39.3`, `typescript` `5.9.2` → `6.0.3`, and `@types/node ^25.9.1`
   added; `nodes/OneAi/globals.d.ts` (the hand-rolled `declare class Buffer` shim) was deleted as a result.

### The surface, counted honestly

| | local `HEAD` (v0.1.8) | `origin/main` (v0.1.9, = npm `latest`) |
|---|---|---|
| Resources offered in the UI | **7** | **8** (adds `compliancePattern`) |
| Operations offered in the UI | **39** | **51** |
| Operation `.ts` files on disk | 67 across 14 resource folders | 67+ |
| Resource folders present as code but **commented out** of the node | 7 (`apiKey`, `auditLog`, `complianceLlm`, `member`, `organization`, `stats`, `team`) | same files still on disk |

🔴 The brief's headline "**67 operations across 14 resources**" is a count of *files*, not of the shipped surface.
Roughly **26 operation files are dead code** — reachable neither from `OneAi.node.ts` nor from `actions/router.ts`,
both of which comment them out with `//`. Anything that measures drift against "67 operations" measures a fiction.
For a repo whose whole purpose is to be maintained by agents, ~26 files of commented-out dispatch arms are a
material liability, and §7.4 returns to it.

---

## §1 · Package shape, and the three bars that get confused

🔴 **These are three different bars.** The brief was right to insist on the distinction; the docs enforce it, and
conflating them is the most likely way an agent prompt goes wrong.

### Bar 1 — a publishable npm package

Anything on npm. No n8n involvement whatsoever. There is no gate here.

### Bar 2 — installable as a community node

This is the bar that makes the package *loadable* by an n8n instance. `DOC-LITERAL`, from
`docs/reusable-content/.gitbook/includes/integrations/submit-community-node.md` (included verbatim into
`docs/connect/create-nodes/deploy-your-node/submit-community-nodes.md`):

> ## Standards
>
> Developing with the [`n8n-node` tool] ensures that your node adheres to the following standards required to make your node available in the n8n community node repository:
>
> * Make sure the package name starts with `n8n-nodes-` or `@<scope>/n8n-nodes-`. For example, `n8n-nodes-weather` or `@weatherPlugins/n8n-nodes-weather`.
> * Include `n8n-community-node-package` in your package keywords.
> * Make sure that you add your nodes and credentials to the `package.json` file inside the `n8n` attribute.
> * Check your node using the linter (`npm run lint`) and test it locally (`npm run dev`) to ensure it works.
> * Publish the package to npm.

**Where we stand:** `LOCAL-FACT` — all met.
`@oneai-eu/n8n-nodes-oneai` ✅ scoped `n8n-nodes-` name; ✅ `n8n-community-node-package` keyword;
✅ `n8n.nodes` + `n8n.credentials` both point at built `dist/…js` paths; ✅ published to npm.
**Nothing to do at this bar.**

### Bar 3 — verified by n8n (the Creator Portal bar)

This is the bar that gets a node into the **nodes panel** of every n8n instance with verified community nodes
enabled, self-hosted and Cloud. `DOC-LITERAL`, `docs/connect/create-nodes/build-your-node/reference/verification-guidelines.md`:

> **Do you want n8n to verify your node?**
>
> Follow these guidelines while building your node if you want to submit it for verification by n8n. Any user with verified community nodes enabled can discover and install verified nodes from n8n's nodes panel across all deployment types (self-hosted and n8n Cloud).

The requirements, quoted verbatim and then checked against us:

| # | `DOC-LITERAL` requirement (verification-guidelines.md, docs @ 6f4b48e6) | Our node (`origin/main`, v0.1.9) |
|---|---|---|
| V-1 | "All verified community node authors **should** use the `n8n-node` tool to create and check their package." | ✅ `build`/`dev`/`lint` all go through `n8n-node`. |
| V-2 | "The node **MUST** not be an existing node" | ✅ no built-in OneAI node. |
| V-3 | "n8n isn't accepting Logic or Flow control nodes at the moment." | ✅ `group: ['transform']`, an API integration. |
| V-4 | "**Each package should integrate exactly one third-party service.** … Packages that wrap multiple unrelated APIs or **act as a proxy layer for several services** generally don't qualify for verification." | ⚠️ see the risk note below — this is the one requirement our shape can drift into violating. |
| V-5 | "Verify that your npm package repository URL matches the expected GitHub repository." | ✅ `repository.url` = `github.com/oneai-eu/n8n-nodes-oneai`, public. |
| V-6 | "Confirm that the package author / maintainer matches between npm and the repository." | ⚠️ `UNKNOWN` (U-2) — the npm maintainer list was not checked against the GitHub org. |
| V-7 | "Make sure your package license is MIT." | ✅ `"license": "MIT"` + `LICENSE.md`. |
| V-8 | "Packages **should be published from a GitHub action** and include provenance" — and, hardened elsewhere: "**From May 1st 2026 you must publish ALL community nodes using a GitHub action** and include a provenance statement" | ✅ **already compliant.** `.github/workflows/publish.yml` runs on `release: created` with `id-token: write` and `npm publish --access public --provenance`. The 0.1.9 tarball carries an npm attestation with `predicateType: https://slsa.dev/provenance/v1`. |
| V-9 | "Ensure that your package does **not** include any external dependencies to keep it lightweight and easy to maintain." — restated as a hard rule on the submit page: "**verified community nodes aren't allowed to use any run-time dependencies.**" | ✅ `dependencies` is absent entirely. `peerDependencies: { "n8n-workflow": "*" }` and dev-only tooling. |
| V-10 | "Provide clear documentation … Include usage instructions, example workflows, and any necessary authentication details." | ⚠️ README exists and ships in the tarball; whether it carries **example workflows** is a gap worth a docs-agent pass. |
| V-11 | "The code **must not** interact with environment variables or attempt to read/write files. Pass all necessary data through node parameters." | ✅ no `process.env`, no `fs` in `nodes/` or `credentials/`. |
| V-12 | "Use **TypeScript** … Ensure proper error handling and validation. Make sure the linter passes (in other words, make sure running `npx @n8n/scan-community-package n8n-nodes-PACKAGE` passes)." | ⚠️ **never run.** See §5.2 — this is a named, runnable gate we do not have in CI. |
| V-13 | "Both the node interface and all documentation must be in **English** only. This includes parameter names, descriptions, help text, error messages and **README** content." | ✅ spot-checked English throughout. Worth a standing lint for a German-market product. |

Two things the verification page does **not** say, and an agent must not invent:

- It says nothing about an `engines` field. Our package has none; **`UNKNOWN` whether that matters** (U-3).
- It says nothing about a peer-dependency version policy. Our `"n8n-workflow": "*"` is not addressed by any
  quoted requirement. §3.5 argues it is nonetheless a real risk now that n8n is on 2.x.

#### 🔴 V-4 is the requirement our roadmap can break

The rule is *one third-party service per package*, and it explicitly excludes packages that "act as a proxy layer
for several services". Our node is a client for **one** service (an OneAI instance), so it passes today. But the
node exposes an `ai` resource that is an **inference gateway** — `createResponse`, `generateImage`,
`transcribeAudio`, `listModels` fronting OpenAI/Anthropic/Google/Mistral models — and 0.1.9 added a credential
switch literally called **`gatewayOnly`**.

Whether an n8n reviewer reads "an LLM gateway with a model picker" as one service (OneAI) or as a proxy layer for
several (the model vendors) is `UNKNOWN` (U-4) and is not answerable from the documentation. It is also not a
question an agent should guess at: it is a submission-risk judgement (§9, P-3).

There is a second, sharper line on the same page, and it applies directly to an AI-adjacent node:

> Note that n8n reserves the right to reject nodes that compete with any of n8n's paid features, especially enterprise functionality.

`DOC-LITERAL`, submit-community-node.md. `INTERPRETED`: n8n sells AI/LangChain functionality and enterprise
governance features. A node whose pitch is "EU AI Act-compliant AI governance" sits closer to that line than a
CRM connector does. This is a real submission risk, not a technical defect, and it belongs to the owner (§9, P-3).

#### The `n8n` block, and what the CLI scaffolds today

`DOC-LITERAL` (`using-the-n8n-node-tool.md`): `npm create @n8n/node@latest` scaffolds a project; templates are
`declarative/github-issues`, `declarative/custom`, `programmatic/example`. The scaffold "includes a ready-to-use
`publish.yml` workflow", and `npm run release` "bump[s] the version, commit, tag, and push". The `release`
command uses `release-it` and will "build the node · run lint checks · update the changelog · create git tags ·
create a GitHub release · publish the package to npm".

Our `n8n` block, `LOCAL-FACT`:

```json
"n8n": {
  "n8nNodesApiVersion": 1,
  "credentials": ["dist/credentials/OneAiApi.credentials.js"],
  "nodes": ["dist/nodes/OneAi/OneAi.node.js"],
  "strict": true
}
```

`n8nNodesApiVersion: 1` is what the current scaffold emits and there is no API version 2 in evidence — `UNKNOWN`
whether n8n 2.x introduces one (U-5). `strict: true` is present; what it does is **`UNKNOWN`** (U-6) — it appears
in no page of the pinned corpus. An agent must not describe it as "strict type checking" without settling U-6.

**Our `publish.yml` is hand-written and predates the scaffolded one.** It runs `npm install && npm publish
--provenance` on `release: created`; it does **not** run `npm run build` or `npm run lint` in CI. It gets away
with that only because `prepublishOnly` runs both locally inside `npm publish`. `INTERPRETED`: that is fragile —
`prepublishOnly` is a convention, not a gate, and a lint failure surfaces as a failed publish rather than a failed
check. Comparing against the current `n8n-nodes-starter` `publish.yml` is cheap and is a concrete first task for
an implementer agent.

**Cost of closing §1:** low. V-12 (`scan-community-package` in CI) is a few lines of workflow. V-10 (README
example workflows) is a docs pass. V-6/U-2 is a five-minute check by whoever owns the npm org. V-4 and the
"competes with paid features" risk are not engineering work at all.

---

## §2 · Declarative vs programmatic

### 2.1 What n8n says, verbatim

`DOC-LITERAL`, `docs/connect/create-nodes/plan-your-node/choose-a-node-building-style.md` (docs @ 6f4b48e6):

> n8n has two node-building styles, declarative and programmatic.
>
> You should use the declarative style for most nodes. This style:
>
> * Uses a JSON-based syntax, making it simpler to write, with less risk of introducing bugs.
> * Is more future-proof.
> * Supports integration with REST APIs.
>
> The programmatic style is more verbose. You must use the programmatic style for:
>
> * Trigger nodes
> * Any node that isn't REST-based. This includes nodes that need to call a GraphQL API and nodes that use external dependencies.
> * Any node that needs to transform incoming data.
> * Full versioning. Refer to [Node versioning] for more information on types of versioning.

And the mechanical difference:

> The main difference between the declarative and programmatic styles is how they handle incoming data and build API requests. The programmatic style requires an `execute()` method, which reads incoming data and parameters, then builds a request. The declarative style handles this using the `routing` key in the `operations` object.

The CLI's own framing reinforces the preference — `DOC-LITERAL`, `using-the-n8n-node-tool.md`, describing the
`n8n-node new` prompt:

> * **HTTP API**: A low-code, declarative node structure that's designed for faster approval for n8n Cloud.
> * **Other**: A programmatic style node with full flexibility.

That is the strongest statement in the corpus for our purposes: **declarative is explicitly associated with
faster approval**. Two of the three scaffolding templates are declarative.

### 2.2 Does a 67-operation surface change the answer? No — and the docs never mention size

🔴 `UNKNOWN`→**settled negative**: the pinned corpus contains **no** guidance keyed to the *number* of operations.
Not in `choose-a-node-building-style.md`, not in `choose-node-file-structure.md`, not in the verification
guidelines. The choice is framed entirely by **capability requirements**, never by scale.

So the honest answer to "is a 67-operation surface expected to be declarative?" is: *the question as posed is not
one n8n answers.* What the documented rules actually say about **our** node is much more specific, and it is a
clean, evidence-backed verdict:

| Programmatic is **required** when… (`DOC-LITERAL`) | Does it apply to us? |
|---|---|
| Trigger nodes | No — we ship no trigger (§6). |
| Not REST-based / GraphQL / external dependencies | No — OneAI's API is REST, and we have zero runtime deps. |
| **"Any node that needs to transform incoming data"** | **Yes.** |
| **Full versioning** | **Yes, prospectively** — see §3. |

The third row is decisive and it is not a close call. `LOCAL-FACT`, examples from `origin/main`:

- `space/uploadFile.operation.ts` calls `this.helpers.getBinaryDataBuffer(index, binaryPropertyName)` to pull a
  binary out of the incoming item, `PUT`s it as an octet-stream, and then **conditionally fires a second HTTP
  request** (`POST /api/spaces/{id}/files/embed`) when `autoEmbed` is set, merging both responses into one output
  item. That is two dependent requests plus binary handling driven by a parameter, inside one operation.
- `transport/index.ts` implements `oneAiApiRequestAllItems`, a hand-rolled `while` pagination loop keyed on
  `hasNextPage` / `totalCount` with an out-of-band `itemsKey` and `paginationKey`.
- `ai/createResponse.operation.ts` offers an `inputMode` of `messages` (a `fixedCollection` the node assembles
  into an array) or `json` (passed through) — i.e. the node reshapes user input into the wire body.

`INTERPRETED` but with high confidence: **rewriting this node declaratively would be a rewrite, not a migration**,
and several operations have no clean declarative expression at all without `postReceive` gymnastics. Declarative
`routing` does support pagination and `postReceive` transforms, but binary upload + conditional second call is
exactly the "transform incoming data" case the docs carve out.

**Verdict: our programmatic style is correct and is explicitly sanctioned. Do not churn it.** The cost of a
declarative rewrite would be the whole node, the payoff is "faster approval" for a node that is *already
verified*, and the price is losing full versioning — which §3 argues is the thing we most need to gain.

### 2.3 🔴 But the 0.1.9 shape has a real problem, and it is not declarative-vs-programmatic

`LOCAL-FACT`: on `origin/main`, `resource` and `operation` are `loadOptions`-driven:

```
displayName: 'Resource Name or ID'      ← loadOptions: getResources  (filters on credentials.gatewayOnly)
displayName: 'Operation Name or ID'     ← loadOptions: getOperations (filters on resource + gatewayOnly)
```

The `Name or ID` suffix is the `eslint-plugin-n8n-nodes-base` convention for a field whose options are loaded
dynamically (the same suffix appears on `Model Name or ID` in `createResponse`), so the rename was almost
certainly the lint fix in commit `aef3e2e` ("Fix lint errors for release") rather than a deliberate UX choice.

Three consequences, and I am explicit about the class of each:

1. `DOC-LITERAL` (`node-ui-elements.md` / `ux-guidelines.md` describe `action` on static operation options as
   what surfaces in the panel — see §7.3): the **Actions list in the nodes panel is built from the static
   `options` array of the `operation` property**. A `loadOptions` operation field has no static options.
   `INTERPRETED`, needing a live check (U-7): **our node's 51 operations probably no longer appear as
   individually searchable actions in the n8n nodes panel.** Every `action:` string in `modes.ts` — all 51,
   carefully written — may be inert.
2. `INTERPRETED`: a dynamic resource/operation list means the parameter values now depend on a **successful
   authenticated HTTP call at design time**. `getModels` already handles this by returning
   `[{ name: 'Unauthenticated', value: '' }]` on failure; `getResources`/`getOperations` read only the
   credential's `gatewayOnly` boolean, so they degrade less badly — but the pattern couples the whole UI to
   credential state.
3. `INTERPRETED`: `usableAsTool: true` (§6.3) means an AI agent picks this node's operation. What an agent sees
   for a `loadOptions` field versus a static `options` field is `UNKNOWN` (U-7) and is worth a live trace, because
   "the node is usable as a tool but the tool can't enumerate its operations" would be a silent, total defect.

**This is the highest-value live-trace target in the whole document**, precisely because it is invisible to
`lint`, invisible to `build`, and invisible to any static drift check. It is also a change we shipped to npm
seven weeks ago and have never observed in a running n8n. §5.4 makes the general version of this argument.

</content>

---

## §3 🔴 · Versioning and backwards compatibility

This is the section that decides a real product question, so it is the longest and the most literal. Our node is
published and installed; workflows exist that were saved against `v0.1.x`. The question "may we change X" has a
precise, mechanical answer, and the mechanism is not the npm version at all.

### 3.0 The one distinction everything else hangs on

There are **two independent version numbers**, and confusing them is the classic error:

| | What it is | Who reads it | Effect on an existing workflow |
|---|---|---|---|
| **package version** (`0.1.9` in `package.json`) | npm semver of the *package* | npm, the instance operator installing/upgrading | none, directly — upgrading the package replaces the code every existing workflow runs |
| **node `typeVersion`** (`version: 1` in `OneAi.node.ts`) | the *node type*'s version, stamped into every saved workflow node | n8n's workflow loader | **everything** — this is the only thing that pins old behaviour |

`LOCAL-FACT`: our node declares `version: 1` as a **plain number**. Every OneAI node any user has ever placed in
a workflow is saved with `typeVersion: 1`. Bumping the npm package from `0.1.8` to `0.1.9` did **not** create a
new node version — it silently replaced the code behind `typeVersion: 1` for every existing workflow on every
instance that upgraded. That is the actual compatibility surface, and it is currently unguarded.

### 3.1 How n8n picks a version — verbatim

`DOC-LITERAL`, `docs/connect/create-nodes/build-your-node/reference/versioning.md` (docs @ 6f4b48e6):

> n8n supports node versioning. You can make changes to existing nodes without breaking the existing behavior by introducing a new version.
>
> Be aware of how n8n decides which node version to load:
>
> * If a user builds and saves a workflow using version 1, n8n continues to use version 1 in that workflow, even if you create and publish a version 2 of the node.
> * When a user creates a new workflow and browses for nodes, n8n always loads the latest version of the node.

That is the entire guarantee, and it is a strong one: **an old workflow keeps running the old code, forever, as
long as the old version still exists in the package.**

### 3.2 The three mechanisms

n8n documents three, and they are not alternatives so much as tiers.

#### (a) Light versioning — available to every node style

`DOC-LITERAL`, versioning.md:

> One node can contain more than one version, allowing small version increments without code duplication. To use this feature:
>
> 1. Change the main `version` parameter to an array, and add your version numbers, including your existing version.
> 2. You can then access the version parameter with `@version` in your `displayOptions` in any object (to control which versions n8n displays the object with). You can also query the version from a function using `const nodeVersion = this.getNode().typeVersion;`

with the worked example:

> ```js
> {
>     displayName: 'NASA Pics',
>     name: 'NasaPics',
>     // List the available versions
>     version: [1,2,3],
>     properties: [
>         {
>             displayName: 'Resource name',
>             displayOptions: {
>                 show: {
>                     '@version': 2,
>                 },
>             },
>         },
>     ],
> }
> ```

🔴 Note step 1: **"including your existing version."** Going from `version: 1` to `version: [1, 2]` is the
safe move; going to `version: 2` is the breaking one.

#### (b) Feature-based versioning — newer, and not in older tutorials

`DOC-LITERAL`, versioning.md:

> Feature flags let you control parameter visibility and execution logic based on named features tied to node versions.
>
> Add a `features` object to your node type description. Each feature uses `@version` conditions to specify which versions enable it:
>
> ```js
> {
>     version: [2, 2.1, 2.2, 2.3, 2.4],
>     features: {
>         useNewApi: { '@version': [{ _cnd: { gte: 2.2 } }] },
>         useLegacyAuth: { '@version': [{ _cnd: { lte: 2.1 } }] },
>         useSpecialMode: { '@version': [2] },
>     },
> }
> ```
>
> Available conditions: `gte`, `lte`, `gt`, `lt`. Pass a plain version number to match a specific version.

Used in `displayOptions` via `'@feature': ['useNewApi']`, negated via `'@feature': [{ _cnd: { not: 'useNewApi' } }]`,
and in code via:

> ```js
> if (this.isNodeFeatureEnabled('useNewApi')) {
> ```

Corroborated in the runtime: `n8n-workflow@2.16.0` exports `getNodeFeatures(featuresDef, nodeVersion)` from
`node-helpers` (`DOC-LITERAL`, `dist/cjs/node-helpers.d.ts`).

`INTERPRETED`: this is the mechanism that makes a **long, forked-behaviour** migration survivable without
duplicating a 51-operation node. For a node like ours — where a v2 would differ from v1 in a handful of named
behaviours rather than wholesale — feature-based versioning is very likely the right tool, and it did not exist
in the material anyone would have read when this node was written.

#### (c) Full versioning — `VersionedNodeType`

`DOC-LITERAL`, versioning.md:

> This isn't available for declarative-style nodes.
>
> As an example, refer to the [Mattermost node].
>
> Full versioning summary:
>
> - The base node file should extend `NodeVersionedType` instead of `INodeType`.
> - The base node file should contain a description including the `defaultVersion` (usually the latest), other basic node metadata such as name, and a list of versions. It shouldn't contain any node functionality.
> - n8n recommends using `v1`, `v2`, and so on, for version folder names.

⚠️ **The docs name the class wrong.** The class exported by `n8n-workflow@2.16.0` is **`VersionedNodeType`**, not
`NodeVersionedType`. `DOC-LITERAL`, `n8n-workflow@2.16.0` `dist/cjs/versioned-node-type.d.ts`:

```ts
export declare class VersionedNodeType implements IVersionedNodeType {
    currentVersion: number;
    nodeVersions: IVersionedNodeType['nodeVersions'];
    description: INodeTypeBaseDescription;
    constructor(nodeVersions: IVersionedNodeType['nodeVersions'], description: INodeTypeBaseDescription);
    getLatestVersion(): number;
    getNodeType(version?: number): INodeType;
}
```

and the implementation (`dist/cjs/versioned-node-type.js`) is four lines of real logic:

```js
constructor(nodeVersions, description) {
    this.nodeVersions = nodeVersions;
    this.currentVersion = description.defaultVersion ?? this.getLatestVersion();
    this.description = description;
}
getLatestVersion() { return Math.max(...Object.keys(this.nodeVersions).map(Number)); }
getNodeType(version) {
    if (version) { return this.nodeVersions[version]; }
    else { return this.nodeVersions[this.currentVersion]; }
}
```

An agent that follows the doc's wording verbatim will import a symbol that does not exist. Put the correct name
in the CLAUDE.md.

### 3.3 🔴 What that code proves — the hard invariant

`getNodeType(version)` is a **bare map lookup with no fallback**. Combined with
`getVersionedNodeType(object, version)` in `node-helpers` (`if ('nodeVersions' in object) return
object.getNodeType(version)`), the consequence is exact:

> **A `typeVersion` that has ever been saved into a user's workflow must remain a key in `nodeVersions` for the
> life of the package. Remove it and `getNodeType` returns `undefined` for that workflow's node.**

n8n's own nodes obey this without exception. `DOC-LITERAL`, `n8n-io/n8n@master`,
`packages/nodes-base/nodes/HttpRequest/HttpRequest.node.ts`:

```ts
defaultVersion: 4.5,
…
const nodeVersions: IVersionedNodeType['nodeVersions'] = {
    1: new HttpRequestV1(baseDescription),
    2: new HttpRequestV2(baseDescription),
    3: new HttpRequestV3(baseDescription),
    4: new HttpRequestV3(baseDescription),
    4.1: new HttpRequestV3(baseDescription),
    …
    4.5: new HttpRequestV3(baseDescription),
};
```

and `packages/nodes-base/nodes/Set/Set.node.ts`:

```ts
defaultVersion: 3.5,
…
{ 1: new SetV1(…), 2: new SetV1(…), 3: new SetV2(…), 3.1: new SetV2(…), … 3.5: new SetV2(…) }
```

Three patterns fall straight out of those two files and belong in the CLAUDE.md verbatim:

1. **Versions are never deleted.** HTTP Request still ships V1 code for workflows saved years ago.
2. **Several `typeVersion`s may point at the *same* implementation class.** `4` through `4.5` are all
   `HttpRequestV3`; `1` and `2` are both `SetV1`. A minor bump is how n8n records "behaviour changed slightly,
   handled by `@version` conditions inside V3" without a new folder. This is exactly light versioning nested
   inside full versioning, and it is what makes full versioning affordable.
3. **`defaultVersion` is what new workflows get**, and it is explicit — not simply the max. `VersionedNodeType`
   falls back to `getLatestVersion()` only when `defaultVersion` is absent, so a version can be published and not
   yet made default.

### 3.4 What is safe, what is breaking, what is merely discouraged

Combining the quoted guarantee (§3.1), the map-lookup mechanism (§3.3), and one more piece of `n8n-workflow`
source, here is the table this whole run exists to produce.

The extra piece of source: `getParameterIssues` in `n8n-workflow@2.16.0` (`dist/cjs/node-helpers.js`) validates
**required-and-empty**, `resourceLocator`, `resourceMapper`, `filter`, `validateType`, and `fixedCollection`
field-count bounds. `DOC-LITERAL` by inspection: **it never checks that a saved `options` value still exists in
the property's `options` array.** There is no `typeUnknown`-style issue for a stale operation value.

| Change | Verdict | Why (class) | What actually happens to a saved workflow |
|---|---|---|---|
| **Add** a new operation to an existing resource | ✅ **Safe** | `INTERPRETED` from the mechanism; universal practice in `nodes-base` | Nothing. Old workflows never reference it. |
| **Add** a new resource | ✅ **Safe** | same | Nothing. |
| **Add** an *optional* parameter with a `default` | ✅ **Safe** | `DOC-LITERAL` — `getNodeParameters(..., returnDefaults, ...)` fills absent values from `default` | The parameter appears with its default. |
| **Add** a *required* parameter to an existing operation | 🔴 **Breaking** | `DOC-LITERAL` — `getParameterIssues` raises a `parameters` issue when `required === true` and the value is missing | The node shows a parameter issue and won't execute until re-opened and filled. Gate this behind a new `typeVersion` + `@version` or `@feature`. |
| **Change a parameter's `default`** | ⚠️ Discouraged | `INTERPRETED` | Saved workflows keep their stored value, so nothing breaks *now*; but a workflow saved before the parameter existed silently adopts the new default. |
| **Rename a parameter** (`name` key) | 🔴 **Breaking, silently** | `INTERPRETED` from the mechanism | The old key stays in the saved JSON and is ignored; the new key resolves to its `default`. **No error is raised.** This is the worst failure mode in the table because it is invisible. |
| **Rename an operation's `value`** (e.g. `createResponse` → `chat`) | 🔴 **Breaking, and it reaches the user as our own error** | `DOC-LITERAL` (no options-membership validation in `getParameterIssues`) + `LOCAL-FACT` (`actions/router.ts` `default:` arm) | Saved value persists with no editor warning; at execution the router hits `default:` and throws `NodeOperationError(this.getNode(), 'Unknown operation: createResponse')`. |
| **Remove** an operation or resource | 🔴 **Breaking**, same path | same | Identical to a rename. |
| **Change a `displayName`** (of node, resource, operation or parameter) | ✅ **Safe** | `DOC-LITERAL` — `INodeTypeBaseDescription.name` is the identity; `displayName` is presentation | Cosmetic only. Confirmed by n8n itself: `Set.node.ts` still has `name: 'set'` while the product is called "Edit Fields". Our 0.1.9 `OneAI`→`oneAI` rebrand kept `name: 'oneAi'` — **correct, and the right precedent to write down.** |
| **Change the node's `name`** (`'oneAi'`) | 🔴 **Catastrophic** | `INTERPRETED`, high confidence | Every saved workflow references `@oneai-eu/n8n-nodes-oneai.oneAi`. A rename makes every existing node unrecognised (`typeUnknown`). Never do this. |
| **Change the credential's `name`** (`'oneAiApi'`) | 🔴 **Catastrophic** | same | Every stored credential and every node's credential binding is keyed on it. |
| **Add a credential field** | ✅ **Safe if optional** | `LOCAL-FACT` precedent: 0.1.9 added `gatewayOnly`, read as `credentials.gatewayOnly === true`, so `undefined` behaves as `false` | Existing credentials keep working. **This is the pattern to copy.** |
| **Change what an existing operation *does*** (different endpoint, different output shape) | 🔴 **Breaking**, and completely invisible to n8n | `INTERPRETED` | n8n has no mechanism to notice. Downstream nodes reading the old output shape break at runtime. This is a `@version`/`@feature` case. |
| **Remove a `typeVersion` from the `version` array / `nodeVersions` map** | 🔴 **Catastrophic** | `DOC-LITERAL`, `VersionedNodeType.getNodeType` is an unguarded map lookup | Returns `undefined` for every workflow pinned to it. |
| **Bump the npm package version** | ✅ Safe by itself | — | Irrelevant to node versioning. It replaces the code behind whatever `typeVersion`s the package declares. |

### 3.5 Where we stand, and what closing the gap costs

`LOCAL-FACT`, `origin/main`:

```ts
version: 1,          // plain number, not an array
// no `features` object
// no `defaultVersion`
// class OneAi implements INodeType   (not extends VersionedNodeType)
```

**We have no versioning mechanism at all.** Not "the wrong one" — none. Today every change we ship lands directly
on `typeVersion: 1` in every existing workflow on every instance that upgrades the package. The 0.1.9 release is
already an example: it changed `resource` and `operation` from static `options` to `loadOptions` (§2.3) on
`typeVersion: 1`. Whether that altered the behaviour of a workflow saved against 0.1.8 is `UNKNOWN` (U-7) and
should have been a versioning decision rather than a lint fix.

The escalation ladder, cheapest first:

| Step | Cost | Buys |
|---|---|---|
| **1. `version: 1` → `version: [1]`** | one line; no behaviour change | Nothing yet, but it makes every later step a one-token edit instead of a refactor, and it is the shape the docs tell you to start from ("including your existing version"). Do this whether or not anything else happens. |
| **2. Light versioning — `[1, 1.1]`, gate new/changed parameters on `@version`** | small, per-change | Everything in the "Breaking" rows above becomes safe **for existing workflows**. Sufficient for adding required parameters and for changing an operation's behaviour. |
| **3. Feature-based versioning — a `features` block + `isNodeFeatureEnabled()`** | moderate: one `features` object and a branch per forked behaviour | Named, readable behaviour forks across a range of versions, without duplicating the node. `INTERPRETED`: the best fit if OneAI's API changes shape under us — which, given the platform ships continuously, is the realistic case. |
| **4. Full versioning — `VersionedNodeType` + `v1/` and `v2/` folders** | large: the node becomes a base file plus per-version implementation trees | A genuinely different node under the same name. Justified only by a wholesale redesign of the operation surface — e.g. the "what belongs in a workflow node at all" cut described in §9, P-1. n8n's own precedent (`HttpRequest`) shows you then *still* use light versioning inside each major. |

Two things follow that agents must be told, not left to infer:

- 🔴 **Renaming or removing an operation is never made safe by a new node version alone.** A new `typeVersion`
  protects *existing* workflows only because they keep executing the old code — which means the old operation
  must still exist and still work in the old version's code path. Deleting `createResponse` from
  `actions/router.ts` breaks v1 workflows no matter what the `version` array says. Under full versioning the old
  code physically survives in `v1/`; under light versioning it does not, so **light versioning cannot express a
  removal.** That distinction is the single most useful sentence in this section.
- **`peerDependencies: { "n8n-workflow": "*" }`** is `LOCAL-FACT` and, with `n8n-workflow` now at **2.16.0**
  while our node was written against the 1.x line, it is a wildcard across a major boundary. No quoted n8n
  requirement forbids it (§1), so this is `INTERPRETED`: an unpinned peer across a major means nothing will warn
  us when a type or helper we rely on changes. Whether n8n 2.x actually broke anything for community nodes built
  against 1.x is `UNKNOWN` (U-8) and is the **highest-value single question in this document** — it is the
  difference between "our node still works" and "our node still installs".

### 3.6 🔴 Correction, forced by evidence found later in this run

An earlier draft of §3.5 flagged `peerDependencies: { "n8n-workflow": "*" }` as a risk worth pinning. **That is
wrong, and the lint rules prove it.** `DOC-LITERAL`, `@n8n/eslint-plugin-community-nodes` rule
`valid-peer-dependencies` (`n8n-io/n8n@master`, `packages/@n8n/eslint-plugin-community-nodes/docs/rules/valid-peer-dependencies.md`):

> Community node packages must declare their n8n integration via `peerDependencies` so that they resolve against the host n8n installation rather than bundling their own copy. The only permitted entries are:
>
> - `n8n-workflow` — required, must be exactly `"*"` (no pinned or ranged versions)
> - `ai-node-sdk` — optional, present only for AI nodes …
>
> Any other entry (notably `n8n-core`) is flagged because it causes duplicate or incompatible copies of n8n internals to be loaded at runtime.

with `"n8n-workflow": "^1.0.0"` shown explicitly under **❌ Incorrect**.

So `"*"` is **mandatory, lint-enforced, and auto-fixed to `"*"` if you change it.** Our package is correct and
must stay correct. The real risk it creates does not go away — a node built against 1.x types now resolves
against a 2.x host — but the remedy is **not** a version range. It is a live check against a current n8n (§5.4)
and, if 2.x did break something, a code change. U-8 stands, its answer is just no longer "pin the peer".

That reversal is the single best argument in this document for the evidence discipline: the plausible sentence
("an unpinned peer across a major is a defect") was wrong, and only a verbatim rule doc caught it.

---

## §4 · Credentials and the client threat model

Our connector-security axes — multi-tenancy scoping, confirmation bypass, SSRF from *our* egress — do not
transfer. Here we are the **client**, running inside somebody else's n8n. This section is the raw material for a
different, smaller security prompt.

### 4.1 Who the actors are

`INTERPRETED`, but structurally forced:

| Actor | Trusts | Can do |
|---|---|---|
| **The n8n instance operator** | installs our package | runs our code with full host privileges; n8n's own docs say so (below) |
| **The workflow author** | configures the node | supplies credentials, reads node output and errors |
| **A downstream node / an AI agent** | consumes our output | sees everything we put in `json` |
| **OneAI (the API)** | receives our requests | — |

n8n is explicit that a community node is trusted code. `DOC-LITERAL`,
`docs/integrations/community-nodes/risks.md`:

> Installing community nodes from npm means you are installing unverified code from a public source into your n8n instance. This has some risks.
>
> Risks include:
>
> * System security: community nodes have full access to the machine that n8n runs on, and can do anything, including malicious actions.
> * Data security: any community node that you use has access to data in your workflows.
> * Breaking changes: node developers may introduce breaking changes in new versions of their nodes. … Depending on the node versioning approach that a node developer chooses, upgrading to a version with a breaking change could cause all workflows using the node to break.

That third bullet is n8n telling *users* about the risk §3 tells *us* to eliminate. Verification is the counter-
weight: "n8n vets verified community nodes … These nodes have to meet a set of data and system security
requirements for approval." There is also a blocklist (`docs/integrations/community-nodes/blocklist.md`) —
"n8n maintains a blocklist of community nodes. You can't install any node on this list" — for nodes that are
"intentionally malicious" or "low quality (low enough to be harmful)". **A verified node can be de-listed.** That
is the real consequence of shipping something careless, and it belongs in the security prompt's stakes section.

### 4.2 Storage and injection — what n8n does for us

`DOC-LITERAL`, `credentials-files.md`:

> The credentials file defines the authorization methods for the node. … In the credentials file, you can use all the n8n UI elements. **n8n encrypts the data that's stored using credentials using an encryption key.**

Injection is declarative, via `IAuthenticateGeneric`, and the header form is documented verbatim as

> ```typescript
> authenticate: IAuthenticateGeneric = {
> 	type: 'generic',
> 	properties: {
> 		header: {
> 			Authorization: '=Bearer {{$credentials.authToken}}',
> 		},
> 	},
> };
> ```

`LOCAL-FACT` — ours is byte-for-byte this pattern with `$credentials.apiKey`, plus a `test` request against
`/api/auth/check`. **This is the correct shape and n8n does the secret handling.** The reason it matters is the
next rule.

`DOC-LITERAL`, lint rule `no-http-request-with-manual-auth`:

> Disallow `this.helpers.httpRequest()` in functions that call `this.getCredentials()`. Use `this.helpers.httpRequestWithAuthentication()` instead.

and `code-standards.md`:

> `auth`: Used for Basic auth. Provide `username` and `password`. **n8n recommends omitting this, and using `helpers.httpRequestWithAuthentication(...)` instead.**

**The security-relevant invariant is therefore: the API key is never touched by our code.** `LOCAL-FACT`, our
`transport/index.ts` calls `this.getCredentials('oneAiApi')` and then
`this.helpers.httpRequestWithAuthentication.call(this, 'oneAiApi', requestOptions)` — it reads the credential
only for `credentials.url`, never for `apiKey`. The same holds in `OneAi.node.ts`'s `getModels` and (on
`origin/main`) `getResources`/`getOperations`, which read only `credentials.gatewayOnly`. ✅ **No code path in the
node ever reads `credentials.apiKey`.** That single sentence is the strongest security statement we can make
about this node and it should be an assertion the validator agent re-checks on every diff, because it is exactly
one careless line away from being false.

### 4.3 What the lint rules enforce as security, and where we stand

`DOC-LITERAL`, the `@n8n/eslint-plugin-community-nodes` rules list (`n8n-io/n8n@master`, README of that package,
version 0.31.0 published):

| Rule | What it forbids (verbatim) | Us (`LOCAL-FACT`) |
|---|---|---|
| `no-dangerous-functions` | "Disallow `eval`, the `Function` constructor, and `child_process` process-spawning functions (`exec`, `spawn`, etc.)" | ✅ none present |
| `no-hardcoded-secrets` | "Disallow hardcoded secrets (API keys, tokens, passwords) embedded as string literals in source." | ✅ none |
| `no-restricted-globals` | "Restricted globals include: `clearInterval`, `clearTimeout`, `global`, `globalThis`, `process`, `setInterval`, `setTimeout`, `setImmediate`, `clearImmediate`, `__dirname`, `__filename`." — because they "are restricted on n8n Cloud" | ✅ scanned every `.ts` under `nodes/` and `credentials/` on `origin/main`: **zero hits** |
| `no-restricted-imports` | "**Allowed modules:** `n8n-workflow`, `lodash`, `moment`, `p-limit`, `luxon`, `zod`, `crypto`, `node:crypto`. Relative imports … are always allowed." | ✅ we import only `n8n-workflow` and relative paths |
| `no-runtime-dependencies` | "Disallow non-empty `dependencies` in community node package.json" | ✅ absent |
| `no-forbidden-lifecycle-scripts` | "npm lifecycle scripts (`prepare`, `preinstall`, `install`, `postinstall`, `prepublish`, `preprepare`, `postprepare`) run automatically — without user confirmation — during `npm install` … A `prepare` or `postinstall` script in a community node is either a misconfiguration … or a supply-chain attack vector." | ✅ — and **narrowly.** We use **`prepublishOnly`**, which is *not* in that list (`prepublish` is; `prepublishOnly` is not, and it runs at publish time, not install time). Correct, but one character from a violation; write it down so nobody "tidies" it. |
| `no-credential-reuse` | "ensuring nodes only reference credentials from the same package" | ✅ `oneAiApi` is ours |
| `credential-password-field` | "Ensure fields with sensitive names have `typeOptions.password = true`" | ✅ `apiKey` has it |
| `credential-test-required` | "Ensure credentials have a credential test" | ✅ `test` → `GET /api/auth/check` |
| `no-silent-error-swallowing` | webhook lifecycle methods must not swallow errors in `catch` | n/a (no webhooks) — **but see the note below** |

⚠️ **The one place we do swallow an error.** `LOCAL-FACT`, `OneAi.node.ts`:

```ts
} catch {
    return [{ name: 'Unauthenticated', value: '' }];
}
```

in the `getModels` load-options method. `no-silent-error-swallowing` scopes itself to webhook lifecycle methods,
so this does **not** violate the rule as written, and returning a placeholder option is a defensible design-time
UX choice. It is still a swallowed error in a code path that makes an authenticated HTTP call, and it is worth a
line in the security prompt as a *known and accepted* exception rather than something rediscovered every audit.

### 4.4 🔴 What reaches the workflow author when we throw — and the redaction gap

This is the part the brief asked about and it is where the honest answer is partly `UNKNOWN`.

**What is settled.** `DOC-LITERAL`, `n8n-workflow@2.16.0` `dist/cjs/errors/node-api.error.js`: `NodeApiError`'s
constructor harvests a user-facing `message` and `description` out of the error response by walking a list of
known keys (`message`, `messages`, `description`, `error_message`, `_error_message`, `error_description`, …),
plus an `httpCode`, and it ships canned text for common statuses (e.g. `'401': 'Authorization failed - please
check your credentials'`). `NodeOperationError` takes a message plus `{ description, itemIndex }`.

**What n8n redacts.** `DOC-LITERAL`, `n8n-workflow@2.16.0` `dist/cjs/constants.js`:

```js
// Value used when redacting sensitive credential data for the client (never sent decrypted)
exports.CREDENTIAL_BLANKING_VALUE = '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6';
```

That constant is about the **credentials modal** — a saved secret is never sent back to the browser. It is not a
statement about node output.

**What is `UNKNOWN` (U-10), and it matters.** I searched `n8n-workflow@2.16.0` for redaction/sanitisation applied
to node output or to errors and **found none**. Neither `NodeApiError` nor `NodeOperationError` scrubs anything;
they copy fields out of whatever object you hand them. The `INTERPRETED` conclusion — flagged as such, and the
right thing for a live trace to settle — is:

> **n8n does not scrub secrets out of what a node returns or out of the error object a node constructs.**
> Whatever a node puts in `json`, or hands to `NodeApiError`, is what the workflow author sees and what n8n
> persists in the execution record.

Three consequences for a client-shaped security prompt, and this is the section's actual output:

1. **Never construct an error from an object that carries the request.** `LOCAL-FACT`: our
   `transport/index.ts` does `throw new NodeApiError(this.getNode(), error as JsonObject)` — it passes the raw
   axios-shaped error straight through. Whether an axios error object carries `config.headers.Authorization`
   into what n8n renders is precisely U-10 and is **testable in ten minutes** against a local n8n by pointing the
   credential at a URL that 401s. Until it is tested, this is the single highest-value unknown in §4.
2. **Never put a credential-derived value in `json`.** Our operations return API responses and echo parameters
   (`spaceId`, `path`), never credential fields. Keep it that way; make it an assertion.
3. **Base URL is user-supplied and that is fine here, but say why.** `LOCAL-FACT`: the credential's `url` field
   is an arbitrary URL the workflow author types, and every request goes to `${baseUrl}${endpoint}`. In OneAI's
   own codebase that shape would be an SSRF finding. **It is not one here**, and the reason must be written down
   so no agent "fixes" it: the request is made by the n8n instance, on behalf of the person who typed the URL,
   with a credential they own — this is the same trust model as n8n's own HTTP Request node. The threat SSRF
   describes (an attacker steering *our* server at *our* internal network) has no analogue. What *is* worth
   checking is the mechanical bit: `baseUrl` is only `.replace(/\/$/, '')`-trimmed, so a `url` with a path
   prefix or a trailing query silently produces a malformed request URL — a UX defect, not a vulnerability.

### 4.5 What a `n8n-node-security` prompt should actually check

Distilled from the above; each line traces to a rule or a quote:

1. No code path reads `credentials.apiKey` (or any secret field) — only `httpRequestWithAuthentication` does.
2. Every `catch` that reaches the user goes through `NodeApiError` / `NodeOperationError`
   (`require-node-api-error`), and nothing raw-`throw`s an axios error.
3. Nothing constructed from a request object reaches the user (U-10 until traced).
4. No restricted global, no restricted import, no runtime dependency, no install-time lifecycle script.
5. Nothing credential-derived appears in a returned `json`.
6. No `eval`/`Function`/`child_process`, no hardcoded secret.
7. English-only user-facing strings (V-13) — a real risk in a German-market product.
8. **Not applicable, and say so explicitly:** multi-tenancy scoping, confirmation tiers/trust windows, SSRF
   egress control, `org_id` scoping. Naming the non-applicable axes is what stops an agent from importing the
   connector security prompt wholesale and producing confident nonsense.

---

## §5 · Testing and linting

### 5.1 🔴 n8n publishes no unit-testing convention for community nodes

This is the finding that decides the question the brief asked, and it is unambiguous. `DOC-LITERAL`,
`docs/connect/create-nodes/test-your-node/README.md` **in its entirety**:

> # Test a node
>
> This section contains information about testing your node.
>
> There are two ways to test your node:
>
> * Manually, by [running it on your own machine] within a local n8n instance.
> * Automatically, using the [linter].
>
> **You should use both methods before publishing your node.**

That is the whole testing doctrine n8n offers a community-node author: **run it in a real n8n, and lint it.**
There is no page on unit tests, no recommended framework, no fixture convention, and no mention of testing in the
verification guidelines. Anyone who tells you n8n requires a test suite for a community node is not quoting n8n.

The manual leg is documented concretely (`docs/reusable-content/.gitbook/includes/integrations/creating-nodes/testing.md`):
`npm run build` → `npm link` → `npm link <package>` inside `~/.n8n/custom` → `n8n start`. The `n8n-node` CLI
collapses that into `n8n-node dev`, which "compile[s] your project and then start[s] up a local n8n instance
through `npm` with your node loaded" (`DOC-LITERAL`, `using-the-n8n-node-tool.md`).

### 5.2 What the linter actually is, and the gate we are not running

`DOC-LITERAL`, `node-linter.md`:

> n8n's node linter, `@n8n/eslint-plugin-community-nodes`, statically analyzes ("lints") the source code of n8n nodes and credentials in community packages. … contains a collection of rules for node files (`*.node.ts`), credential files (`*.credentials.ts`), and the `package.json` of a community package.
>
> **Don't edit the configuration file** — `eslint.config.mjs` contains the ESLint configuration provided by `@n8n/node-cli`. Don't edit this file.

`LOCAL-FACT`: our `eslint.config.mjs` is exactly the two-line re-export
(`import { config } from '@n8n/node-cli/eslint'; export default config;`) — correct, and to be left alone.

`DOC-LITERAL`, `@n8n/node-cli@0.46.3` `dist/configs/eslint.js`: that `config` export is
`createConfig(supportCloud = true)`, which selects `n8nCommunityNodesPlugin.configs.recommended` (the
Cloud-restricted set) over `recommendedWithoutN8nCloudSupport`, layers on `@eslint/js` recommended,
`typescript-eslint` recommended, `eslint-plugin-import-x` flat/recommended, sets **`'no-console': 'error'`**, and
applies `eslint-plugin-n8n-nodes-base`'s `community` / `credentials` / `nodes` rule sets to the matching paths.
**We are on the stricter of the two configs.** Good — and worth knowing, because a future "our node isn't on
Cloud anyway" argument would be a real, deliberate loosening.

🔴 **The gate we don't run.** Verification requires (`DOC-LITERAL`, verification-guidelines.md):

> Make sure the linter passes (in other words, make sure running `npx @n8n/scan-community-package n8n-nodes-PACKAGE` passes).

`@n8n/scan-community-package@0.34.0` is **not** the same thing as `n8n-node lint`. From its own README and
source (`DOC-LITERAL`, the published tarball):

> ## n8n community-package static analysis tool
> Checks npm provenance and runs static analysis for n8n community packages.
> ```
> $ npx @n8n/scan-community-package n8n-nodes-PACKAGE
> ```

and `scanner/scanner.mjs` shows it runs **two legs**: it `npm pack`s the **published tarball** from the registry
and lints the compiled `dist/`, *and* it reads the package's **npm attestation**
(`registry.npmjs.org/-/npm/v1/attestations/<pkg>@<version>`), downloads the **provenance-attested source at that
git commit**, and lints that too. A source comment in that file states the design intent verbatim:

> // in the tarball. An unreachable source is a hard failure — falling
> // back to a tarball-only scan would silently reintroduce that blind

Two things follow that nothing else in this document says:

1. **Provenance is not a formality — the verification scanner functionally depends on it.** Our
   `publish.yml` already emits it (§1, V-8), so we are fine; but a publish without provenance would make the
   verification gate unrunnable, not merely non-compliant.
2. 🔴 **The scan runs a *newer* rule set than we do locally.** `@n8n/scan-community-package@0.34.0` depends on
   `@n8n/eslint-plugin-community-nodes@0.31.0`; `@n8n/node-cli@0.46.3` pins `0.30.0`. It also uses
   `typescript 7.0.2` and `eslint-plugin-n8n-nodes-base ^1.16.7`. **A green `npm run lint` is therefore not proof
   that `scan-community-package` is green.** Running the scan is one command against the *published* package and
   we have never done it. This is the cheapest concrete improvement in the entire document.

### 5.3 Do we introduce a test framework? The evidence says yes-but-narrowly

The brief framed this as "introduce a test framework or lean on a live trace". The corpus supports a sharper
answer than either.

**Vitest is expected to be possible, and is anticipated by the rules themselves.** `DOC-LITERAL`, the
`no-forbidden-lifecycle-scripts` rule doc's own **✅ Correct** example:

```json
{
  "name": "n8n-nodes-example",
  "scripts": { "build": "tsc", "test": "vitest run" }
}
```

and `DOC-LITERAL`, `no-restricted-imports`:

> **Dev dependencies are permitted.** Modules listed in the package's `devDependencies` (e.g. `vitest`, or type-only imports from a types package) are never installed at runtime on n8n Cloud — only the built `dist/` is shipped — so they are not runtime dependencies and are exempt from this rule. … This rule targets runtime dependencies only … including in test files.

n8n's own `@n8n/scan-community-package` ships `"test": "vitest run"` and `vitest ^4.1.9` in devDependencies.
So: **adding vitest is permitted, does not endanger verification, and does not violate `no-runtime-dependencies`.**
One caveat, `DOC-LITERAL`, `no-dead-files`: files literally named `test.js` / `test.ts` under `nodes/` or
`credentials/` are flagged (a *warning*). Name test files `*.test.ts`, or keep them outside those directories.

**But what would a test assert?** `LOCAL-FACT`: this node is ~90% declarative property arrays plus a thin HTTP
call per operation. Unit-testing an operation means mocking `IExecuteFunctions` — i.e. asserting that our mock
returns what we told it to. The platform's own Testing Doctrine calls that failure out by name. The tests that
would earn their keep are the ones that assert **structure**, not behaviour, and those are exactly the ones that
catch the drift this repo actually suffers from:

| Worth testing (`INTERPRETED`, but each maps to a real defect class found in this run) | Catches |
|---|---|
| Every `value` in `modes.ts` `OPERATIONS` has a matching `case` arm in `actions/router.ts`, and vice versa | the dead-code/drift class of §0.1 — 26 orphaned files |
| Every operation's `description` array uses `displayOptions.show` naming a resource/operation pair that exists | a parameter that never appears, or appears everywhere |
| Every `INodeExecutionData` returned carries `pairedItem` | duplicates `missing-paired-item`, but at the composed level |
| The published operation-value set is a **superset** of the previous release's | 🔴 **the §3.4 breaking-rename check** — this is the one that protects users |
| Every operation's endpoint path exists in OneAI's generated OpenAPI spec | the drift the earlier analysis (`docs/ANALYSIS-2026-09-03-agent-pipeline.md` §3) identified as the real problem |

The last two are the argument. Neither is a mock; both are computable from artefacts we own; and the
"superset of the previous release" check is a **compatibility gate**, which no amount of live tracing gives you
because a live trace exercises the new version, not the old workflows.

### 5.4 The live trace remains the only detector for a whole class

`INTERPRETED`, and it follows directly from §2.3 and §4.4: neither `lint`, `build`, nor any static test can tell
you whether a `loadOptions`-driven operation list still shows up in the nodes panel, whether an AI agent can
enumerate our tool's operations, or whether an axios error object leaks an `Authorization` header into the output
panel. Those are properties of a **running n8n rendering our node**. `n8n-node dev` boots exactly that in one
command, which makes the trace phase cheap here in a way it never was for a third-party connector.

**Verdict for the agent set:** keep the linter as the automated gate (it is genuinely substantial — 44 rules),
**add `npx @n8n/scan-community-package` as the pre-release gate**, add vitest *only* for the structural/
compatibility checks above, and make the live trace a first-class phase rather than an optional one.

---

## §6 · Trigger nodes

We ship none. The shape, for when the product question is answered.

### 6.1 The taxonomy, verbatim

`DOC-LITERAL`, `docs/connect/create-nodes/plan-your-node/choose-a-node-type.md`:

> There are two node types you can build for n8n: trigger nodes and action nodes. …
>
> Trigger nodes start a workflow and supply the initial data. A workflow can contain multiple trigger nodes but with each execution, only one of them will execute, depending on the triggering event.
>
> There are three types of trigger nodes in n8n:
>
> | Type | Description |
> | --- | --- |
> | Webhook | Nodes for services that support webhooks. These nodes listen for events and trigger workflows in real time. |
> | Polling | Nodes for services that don't support webhooks. These nodes periodically check for new data, triggering workflows when they detect updates. |
> | Others | Nodes that handle real-time responses not related to HTTP requests or polling. This includes message queue nodes and time-based triggers. |
>
> Action nodes perform operations as part of your workflow.

### 6.2 What a trigger requires that our action node does not

| Requirement | Class + source |
|---|---|
| **Must be programmatic.** "You must use the programmatic style for: Trigger nodes" | `DOC-LITERAL`, choose-a-node-building-style.md |
| **`group: ['trigger']`** | `DOC-LITERAL`, `n8n-workflow@2.16.0` `node-helpers.js`: `function isTriggerNode(nodeTypeData) { return nodeTypeData.group.includes('trigger'); }` |
| **A `poll()` or `webhook()` method**, not `execute()` | `DOC-LITERAL`, `n8n-workflow@2.16.0` `interfaces.d.ts`, `abstract class Node`: `execute?(…)`, `webhook?(context: IWebhookFunctions)`, `poll?(context: IPollFunctions)` |
| **Webhook triggers must implement the full lifecycle** — "Require webhook trigger nodes to implement the complete `webhookMethods` lifecycle (`checkExists`, `create`, `delete`)" | `DOC-LITERAL`, lint rule `webhook-lifecycle-complete` |
| **Those lifecycle methods must not swallow errors** — "Disallow webhook lifecycle methods (`checkExists`, `create`, `delete`) from silently swallowing errors in catch blocks" | `DOC-LITERAL`, lint rule `no-silent-error-swallowing` |
| **Naming discipline** — "Trigger nodes (class name ends with `Trigger`) must label themselves consistently as triggers" | `DOC-LITERAL`, lint rule `trigger-node-conventions` |
| **Item linking still applies** — "This applies to programmatic nodes (**including trigger nodes**)" | `DOC-LITERAL`, item-linking include |
| **Packaging is allowed** — "A trigger node for the same service may be included alongside the main node." | `DOC-LITERAL`, verification-guidelines.md |

That last row settles the packaging question outright: **an `oneAI Trigger` would ship in this same package, not
a second one.** No new npm package, no second verification submission.

`DOC-LITERAL`, error-handling.md, is also relevant to a *polling* trigger specifically: a `failure` declaration
on a thrown error feeds n8n's own backoff — "n8n owns any behavior derived from the declaration, such as how a
polling trigger backs off after a failed poll." So a polling trigger against OneAI would want
`{ cause: 'rate-limited', retryAfterMs }` handling from day one (§7.2).

### 6.3 What we have instead: `usableAsTool`

`LOCAL-FACT`: `OneAi.node.ts` sets `usableAsTool: true`, and `DOC-LITERAL` the lint rule `node-usable-as-tool`
("Ensure node classes have `usableAsTool` property") is in `recommended` and auto-fixable — so this is expected,
not exotic. `DOC-LITERAL`, `n8n-workflow@2.16.0` `interfaces.d.ts` documents the field on
`INodeTypeBaseDescription` as: "Whether the node will be wrapped for tool-use by AI Agents, optionally replacing
provided parts of the description".

**This is a different capability from a trigger and does not substitute for one.** `usableAsTool` lets an AI
Agent node *call* our node mid-workflow; a trigger *starts* a workflow. Whether OneAI should push events into
n8n at all is the product question (§9, P-4). What this section establishes is only that the cost of adding a
trigger later is bounded and well-documented, and that it does not disturb anything in §1–§5.

---

## §7 · Error handling and node ergonomics

### 7.1 The two error classes, and how we use them

`DOC-LITERAL`, `error-handling.md`:

> n8n provides two specialized error classes …
> - **`NodeApiError`**: For API-related errors and external service failures
> - **`NodeOperationError`**: For operational errors, validation failures, and configuration issues

`NodeApiError` is for "HTTP request failures · external API errors · authentication/authorization failures ·
rate limiting errors · service unavailable errors"; `NodeOperationError` for "input validation errors · missing
required parameters · data transformation errors · workflow logic errors".

The documented batch pattern is quoted here in full because our router is very nearly it:

> ```typescript
> for (let i = 0; i < items.length; i++) {
> 	try {
> 		const result = await processItem(items[i]);
> 		returnData.push(result);
> 	} catch (error) {
> 		if (this.continueOnFail()) {
> 			returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
> 			continue;
> 		}
> 		throw new NodeOperationError(this.getNode(), error as Error, {
> 			description: error.description,
> 			itemIndex: i,
> 		});
> 	}
> }
> ```

`LOCAL-FACT`, `actions/router.ts` (identical on `HEAD` and `origin/main` in this respect):

```ts
} catch (error) {
    if (this.continueOnFail()) {
        returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
        continue;
    }
    throw error;
}
```

✅ The `continueOnFail()` half is the documented pattern exactly, `pairedItem` included.
⚠️ The re-throw half is not: we `throw error` bare where the docs wrap in `NodeOperationError` with
`{ itemIndex: i }`. Because our operations already throw `NodeApiError` from `transport/index.ts` and
`NodeOperationError` from the router's `default:` arms, the bare re-throw is usually re-throwing an already-wrapped
error — which is why `require-node-api-error` ("Require `NodeApiError` or `NodeOperationError` for error wrapping
in catch blocks. Raw errors lose HTTP context in the n8n UI.") presumably passes. The cost of the shortcut is
`itemIndex`: an error from item 7 of a 20-item batch is not attributed to item 7. `DOC-LITERAL`, ux-guidelines.md:

> **Item index**: if you have the ID of the item that triggered the error, append `[Item X]` to the error message. For example, `The ID of the release in the parameter "Release ID" for could not be found [item 2]`.

**Small, safe, entirely additive fix** — it changes no parameter and no operation value, so nothing in §3.4
applies to it.

### 7.2 🔴 Failure declarations — a capability we do not use, with a version caveat

`DOC-LITERAL`, error-handling.md:

> Both `NodeApiError` and `NodeOperationError` accept a `failure` option that states why the operation failed. Use it when the node can tell from the response what went wrong, such as a used-up quota or a credential that no longer works. The declaration lands on the error's `failure` property as plain data. **The node states the cause, never what to do about it: n8n owns any behavior derived from the declaration**, such as how a polling trigger backs off after a failed poll.

The six causes, verbatim:

| `cause` | Meaning |
|---------|---------|
| `rate-limited` | The service is throttling requests. |
| `quota-exhausted` | A usage quota ran out and the operation fails until the quota resets. |
| `temporarily-unavailable` | The service is down or degraded right now. |
| `credential-invalid` | The credential no longer works. The user has to reconnect it. |
| `configuration-invalid` | The node points at something that no longer exists or is no longer allowed. |
| `node-defect` | A bug in the node itself. Neither the credential nor the configuration is to blame. |

with optional `retryAfterMs` / `resetsAtEpochMs` wait hints on the first three only, and a rule that matters:

> **Only declare a cause the response proves.** If you can't classify an error with confidence, throw it unchanged: an error without a declaration is still valid.

⚠️ **Version caveat, and I am not going to smooth it over.** The page says:

> **Feature availability** — Failure declarations are available from n8n 3.37.

but the highest `n8n` version on npm today is **2.37.9** (`stable`/`latest`), with `2.38.3` on `next`/`beta` and
a still-maintained `1.123.77` line — all three published within the last three days. **No 3.x exists.**

🔴 **Settled, and the answer is "not yet".** `DOC-LITERAL`, `n8n-workflow@2.16.0`
`dist/cjs/errors/node-api.error.d.ts`: `NodeOperationErrorOptions` is
`{ message?, description?, runIndex?, itemIndex?, level?, messageMapping?, functionality?, type?, metadata? }`
and `NodeApiErrorOptions extends` it with `{ message?, httpCode?, parseXml? }`. **There is no `failure` field**,
on either. The feature the documentation describes is not present in the current published runtime.

**Do not adopt `failure` declarations.** Re-check when the version story resolves — the fit would be excellent,
because OneAI is quota- and plan-bounded and returns `PaymentRequiredError` (→ `quota-exhausted`) and
`UnauthorizedError` (→ `credential-invalid`) distinctly. This is also a clean example of the discipline paying
off twice: the docs say a feature exists "from n8n 3.37", the runtime says it does not exist at all, and only
checking both caught it.

### 7.3 Ergonomics: naming, item linking, and the panel

**Item linking.** `DOC-LITERAL`, the item-linking include:

> n8n needs to know which input item a given output item comes from. If this information is missing, expressions in other nodes may break. As a node developer, you must ensure any items returned by your node support this. This applies to programmatic nodes (including trigger nodes). You don't need to consider item linking when building a declarative-style node.

✅ `LOCAL-FACT`: **every one of the 78 `*.operation.ts` files on `origin/main` contains `pairedItem`.** This was
deliberate work (commit `cff5716`, "add pairedItem tracking to all returnJsonArray calls in operation files") and
it is one of the genuinely good things about this node. Note the cost this imposes: it is a tax the declarative
style would not charge — the one concrete thing §2 gives up by staying programmatic.

**Naming.** `DOC-LITERAL`, ux-guidelines.md:

> * **Name:** This is the name displayed in the select when the node is open on the canvas. It must use title case and doesn't have to include the resource (for example, "Delete").
> * **Action:** This is the name of the operation **displayed in the panel where the user selects the node**. It must be in sentence case and must include the resource (for example, "Delete record").
> * **Description:** This is the sub-text displayed below the name in the select … It must use sentence case and must include the resource.

🔴 That first clause of **Action** is the confirmation §2.3 needed: `action` strings are what render in the
**nodes panel**. `LOCAL-FACT`: `modes.ts` carries an `action` for all 51 operations, in correct sentence case
("Create a response", "List available AI models"). If a `loadOptions` operation field means the panel never reads
them, that work is inert — U-7, and the single best thing a first live trace can settle.

**CRUD expectations.** `DOC-LITERAL`, ux-guidelines.md: "Try to include **CRUD** operations for each resource
type … Create · Create or Update (Upsert) · Delete · Get · **Get Many:** also used when some filtering or search
is available · Update". `LOCAL-FACT`: our resources broadly do (`project`: create/delete/get/list/update). This
sits in tension with the earlier analysis's §5 ("a node that mirrors an entire API is unusable in n8n") — n8n's
UX guidance pushes *toward* CRUD completeness per resource, while the useful-node argument pushes toward
task-shaped operations. Both are right about different things: **CRUD completeness within a resource you chose to
expose; ruthlessness about which resources you expose at all.** That reconciliation is worth stating in the
CLAUDE.md, because an agent handed only one half will do damage.

**Resource Locator.** `DOC-LITERAL`: "Use a Resource Locator component whenever possible. This provides a much
better UX for users. … The default option … should be `From list` (if available)." `LOCAL-FACT`: we use plain
`string` fields for `spaceId`, `projectId`, `chatId` everywhere. This is a genuine, verification-relevant UX gap
(the UX guidelines "must conform" for a verified-node candidate) and it is **large** — it touches most of the 51
operations. It is also purely additive: a `resourceLocator` keeps the same parameter `name`, so §3.4's rename
hazard does not apply, though the stored value shape changes from a string to an object, which **does** need a
`@version` gate. Scope it deliberately; do not let an agent do it opportunistically.

### 7.4 The dead-code problem is an ergonomics problem

`LOCAL-FACT`, restated because it is the thing an agent will trip over first: ~26 operation files under
`nodes/OneAi/actions/{apiKey,auditLog,complianceLlm,member,organization,stats,team}/` are on disk, compile, and
are unreachable — commented out of both `OneAi.node.ts` and `actions/router.ts` with `//`.

`DOC-LITERAL`, the `no-dead-files` lint rule flags only `*.bak`, `*.backup`, `*Zone.Identifier`, `test.js`,
`test.ts` — so **the linter does not catch this**, and neither would `scan-community-package`. It is invisible to
every automated gate.

Its cost is specific and it is aimed at exactly what this research is for: an agent asked "does the node cover
`team`?" finds `nodes/OneAi/actions/team/` with seven operation files and answers yes. It is wrong. Every drift
check, every coverage claim and every "port the missing features" plan built on a file listing is wrong the same
way. Either delete them (they are in git history) or, if they are a staging area for a deliberate re-enablement,
say so in one file. Leaving them is not neutral.

---

## §7.5 · Two `UNKNOWN`s settled from the CLI source, and a publish-pipeline delta

Both came out of reading `@n8n/node-cli@0.46.3`'s published `dist/` rather than the documentation, which is why
they are recorded here rather than in §8.

### U-6 settled: `n8n.strict` is the **n8n Cloud eligibility flag**

`DOC-LITERAL`, `@n8n/node-cli@0.46.3` `dist/commands/cloud-support.js` and `dist/commands/lint.js`.

There is an undocumented CLI command — `n8n-node cloud-support [enable|disable]` — that flips **two things
together**:

| | cloud support **enabled** | cloud support **disabled** |
|---|---|---|
| `eslint.config.mjs` | `import { config } from '@n8n/node-cli/eslint'` | `import { configWithoutCloudSupport } …` |
| `package.json` | `"n8n": { "strict": true }` | `"n8n": { "strict": false }` |

and its own warning text on disable is verbatim:

> This will make your node ineligible for n8n Cloud verification!
> …
> Cloud support disabled. Your node may pass linting but it won't pass verification for n8n Cloud.

`strict: true` additionally makes `n8n-node lint` **verify that `eslint.config.mjs` is unmodified** from the
shipped template — the command's own description says: "In strict mode, verifies eslint config is unchanged from
default." A modified config under strict mode exits 1 with "Strict mode violation". And when a lint run fails on
`no-restricted-imports` or `no-restricted-globals`, the CLI identifies those as `cloudOnlyRules` and offers
`cloud-support disable` as the escape hatch.

**Where we stand (`LOCAL-FACT`): correct on both counts, and by luck rather than intent.** We have
`"strict": true` and the untouched two-line `eslint.config.mjs`. Three things follow, and all three belong in the
CLAUDE.md as prohibitions:

1. **Never edit `eslint.config.mjs`** — the docs say so ("Don't edit this file") and strict mode enforces it.
2. **Never set `"strict": false`** to make a lint error go away. It is not a severity dial; it is a declaration
   that we are giving up n8n Cloud verification. An agent chasing a green lint would absolutely reach for it.
3. `strict` is *not* "strict TypeScript". Anyone who writes that in a prompt has guessed.

### U-3 settled (negatively): no `engines` field is expected

`DOC-LITERAL`, `n8n-io/n8n-nodes-starter@master` `package.json` — the reference template n8n's own docs point at
for existing nodes — has **no `engines` field**. Neither does `@n8n/node-cli` itself. Our omission matches the
reference. Nothing to do.

### The publish pipeline: what the current reference does that we do not

`DOC-LITERAL`, `n8n-nodes-starter@master` `package.json` and `.github/workflows/publish.yml`:

| | starter (current reference) | ours (`origin/main`) |
|---|---|---|
| trigger | `push` on tags matching `'*.*.*'` | `release: { types: [created] }` |
| install | `npm ci` | `npm install` |
| publish step | `npm run release` → `n8n-node release` (release-it: **lint + build + changelog + tag + publish with provenance**) | `npm publish --access public --provenance` |
| `prepublishOnly` | `n8n-node prerelease` | `npm run build && npm run lint` |
| `release` script | `"release": "n8n-node release"` + `release-it` devDep | absent |
| node version | `lts/*` | pinned `22` |
| provenance | ✅ | ✅ |

`n8n-node prerelease` is a hidden command whose entire job is a guard. `DOC-LITERAL`, its source:

> `Prerelease.description = 'Only for internal use. Prevent npm publish, instead require npm run release'`

and it `process.exit(1)`s unless `RELEASE_MODE` is set. **The starter deliberately makes a bare `npm publish`
fail.** Ours deliberately makes it work. That is a defensible difference — but it is a difference, and it means
our releases skip the changelog/tag orchestration and rely on `prepublishOnly` for the lint+build gate (§1).

`INTERPRETED`: adopting the starter's shape is low-risk, mechanical, and would additionally get us `npm ci`
(reproducible installs) and `node-version: lts/*` (n8n itself now requires Node `>=24.0.0`; our workflow pins
22 — harmless for a build, but stale). It is **not urgent** and it touches the release path, so it wants its own
small, deliberate PR rather than being bundled with feature work.

---

## §7.6 · Two more `UNKNOWN`s settled from published artefacts

### U-9 settled (negatively): `failure` declarations do not exist in the current runtime

Covered in §7.2 above. Short form: the docs describe it, `n8n-workflow@2.16.0` does not implement it, and no 3.x
n8n exists on npm. Anything an agent writes about `failure` causes today would be fiction.

### U-1 settled: `@n8n/ai-node-sdk` is for **sub-nodes**, not for us — and it opens a product option

`DOC-LITERAL`, `@n8n/ai-node-sdk@0.27.3`, its published `README.md`:

> **Preview:** This package is in preview. The API may change without notice.
>
> Public SDK for building AI nodes in n8n. This package provides a simplified API for **creating chat model and memory nodes** without LangChain dependencies.

Installation is via peer dependency, verbatim:

```json
{
  "peerDependencies": {
    "n8n-workflow": "*",
    "@n8n/ai-node-sdk": "*"
  }
}
```

which is exactly the shape `valid-peer-dependencies` permits as its one optional extra (§3.6), and which
`ai-node-package-json` pairs with `n8n.aiNodeSdkVersion`. The README's own example is a class named
`LmChatMyProvider` that implements `INodeType` and uses `supplyModel` with `NodeConnectionTypes` —

> Chat model nodes implement the `INodeType` interface and use `supplyModel` to provide model instances.

**So it is a different kind of node entirely.** A chat-model node is a **sub-node**: it does not sit in the main
data flow and it does not have operations. It attaches to an AI Agent node and *is* the agent's LLM.

Three conclusions:

1. **Nothing in our current node should adopt it.** Our `ai` resource is an action-node operation that returns a
   response into the workflow. It is not a chat-model sub-node, and `ai-node-package-json` only bites if we add
   the peer — which we should not, for this node.
2. **It does not invalidate the `ai` resource.** Both shapes are legitimate and they serve different jobs.
3. 🔴 **It is a genuine, previously-unconsidered product option** (P-8 below): a second node in the *same
   package* — an "oneAI Chat Model" sub-node — would let any n8n AI Agent run on OneAI's governed, EU AI
   Act-compliant gateway, which is much closer to OneAI's actual pitch than CRUD over spaces is. Note the
   preview warning: "The API may change without notice."

---

## §8 · Everything classed `UNKNOWN`

An honest gap beats a plausible sentence. Each row says what would settle it and roughly what that costs.

| # | Question | Why it matters | What would settle it | Cost |
|---|---|---|---|---|
| **U-1** | ~~What is `@n8n/ai-node-sdk`?~~ | — | **Settled** in §7.6: it is a *preview* SDK for building **chat-model and memory sub-nodes**. It does not apply to our action node, and it opens a separate product option (P-8). | done |
| **U-2** | Do the npm maintainers of `@oneai-eu/n8n-nodes-oneai` match the GitHub org owners? | Verification requirement V-6, verbatim. | `npm owner ls @oneai-eu/n8n-nodes-oneai` vs the GitHub org member list. Owner/npm-admin only. | 5 min |
| **U-3** | ~~Is an `engines` field expected?~~ | — | **Settled negatively** in §7.5: the reference starter has none. | done |
| **U-4** | Does an LLM-gateway node ("AI" resource fronting several model vendors) violate V-4's "act as a proxy layer for several services"? | Direct verification-rejection risk for the resource we most want to grow. | Ask n8n via the Creator Portal, or find a precedent verified node that fronts multiple model vendors. Not answerable from docs. | owner call (§9, P-3) |
| **U-5** | Is there an `n8nNodesApiVersion` 2, given n8n is on 2.x? | If yes, `1` may become legacy. | Search `n8n-io/n8n` for the loader that reads `n8nNodesApiVersion`; check whether the scaffold ever emits anything but `1`. Current evidence: starter and CLI both emit `1`. | ~30 min |
| **U-6** | ~~What does `n8n.strict` do?~~ | — | **Settled** in §7.5: it is the n8n Cloud eligibility flag + eslint-config tamper check. | done |
| **U-7** | 🔴 With `resource`/`operation` as `loadOptions` fields (0.1.9), do our 51 operations still appear as **actions** in the n8n nodes panel, and can an AI Agent still enumerate them via `usableAsTool`? | If no, the 0.1.9 release silently made the node much harder to discover, and every `action:` string in `modes.ts` is inert. This is a live regression hypothesis about code already published. | `n8n-node dev`, open the nodes panel, search for an operation name; then wire the node under an AI Agent and inspect the tool schema. | **~1h — do this first** |
| **U-8** | 🔴 Does anything in n8n **2.x** break a community node written against the 1.x `n8n-workflow` API? | Decides whether "our node still works" is an assumption or a fact. Note §3.6: the fix is *not* pinning the peer, which lint forbids. | Install `@oneai-eu/n8n-nodes-oneai@0.1.9` into a current n8n 2.37.x and execute one operation of each shape (JSON, binary upload, paginated list). Also worth checking the still-maintained 1.123.x line. | ~2h |
| **U-9** | ~~Do `failure` declarations exist today?~~ | — | **Settled negatively** in §7.6: `NodeApiErrorOptions` in `n8n-workflow@2.16.0` has no `failure` field. The documented feature is not available on any published n8n. Do not adopt. | done |
| **U-10** | 🔴 Does an axios-shaped error passed to `NodeApiError` leak the `Authorization` header into the n8n output panel / persisted execution data? | The one credential-exposure question in an otherwise clean security picture. Our `transport/index.ts` passes the raw error through. | Point the credential at a URL that returns 401 (or a request-bin), run the node in `n8n-node dev`, and read the output panel and the execution record. | **~30 min — cheapest high-value check in this document** |
| **U-11** | Does OneAI's own API surface still match what the 51 operations call? | The drift problem that motivated this whole line of work. | Diff the operation endpoint paths against `/root/oneai`'s generated `src/openapi.gen.ts`. Mechanical, and the obvious first agent task. | ~2h |
| **U-12** | Does the README ship example workflows (V-10)? | A stated verification requirement; ours is short. | Read `README.md` against V-10 and compare against a verified node's README. | 15 min |

Two `INTERPRETED` claims in this document deserve the same treatment as `UNKNOWN`s and should be verified before
anyone builds a rule on them:

- §3.4's claim that **renaming a parameter fails silently** (old key ignored, new key takes its `default`, no
  issue raised). Derived from `getNodeParameters` + the absence of options-membership validation; not stated in
  any doc. One saved workflow and one rename would prove it.
- §5.1's negative claim that **n8n publishes no unit-testing convention**. It is an absence-of-evidence claim over
  a corpus of 51 files — strong, but an absence. If n8n adds a testing page, this section is the first thing that
  goes stale.

---

## §9 · Product decisions — for the owner, not for an agent

These are not research gaps. No amount of reading settles them, and an agent that guesses will produce something
confidently wrong.

**P-1 · What belongs in a workflow node at all.** OneAI's API is far larger than 51 operations, and n8n's UX
guidance pulls in two directions at once (§7.3): be CRUD-complete *within* a resource, be ruthless about *which*
resources exist. Mechanically porting every new OneAI endpoint would make the node worse while making a drift
check green. The prior analysis (`docs/ANALYSIS-2026-09-03-agent-pipeline.md` §5) reached the same conclusion
independently. **Someone has to decide the cut before an architect agent runs**, and the specific pending
question is OneData / Canvas / Browser Session: all of it, or a task-shaped subset?

**P-2 · 🔴 May a future release break existing workflows?** §3 makes the mechanics exact, so the question is now
purely commercial:

- *No, never* → every change is additive or `@version`-gated; renames and removals are off the table; the light-
  versioning ladder (§3.5) starts now.
- *Yes, once, deliberately* → a `VersionedNodeType` v2 with a redesigned surface, v1 preserved verbatim.

The cost difference is roughly one line versus a restructuring of the whole `nodes/` tree, and it changes
what every subsequent agent is allowed to do. It cannot be deferred: **the wrong default is "nobody said, so I
renamed it"**, which §3.4 shows fails silently for parameters and fails at runtime with our own error text for
operations.

**P-3 · Do we resubmit for verification, and do we accept the risk?** Two quoted risks bear on a node like ours:
V-4's "proxy layer for several services" (U-4) and, verbatim, "n8n reserves the right to reject nodes that
compete with any of n8n's paid features, especially enterprise functionality." An AI-governance node is nearer
that line than a CRM connector. There is also downside beyond rejection: the blocklist (§4.1) exists. Whether to
engage n8n at all — and how much of the `ai` gateway resource to lead with — is a positioning decision.

**P-4 · Do we want a trigger node?** §6 establishes it would live in this same package, must be programmatic, and
needs the full `webhookMethods` lifecycle (or a `poll()`). Whether OneAI should push events into n8n at all —
and which events — is a product question about OneAI, not about n8n.

**P-5 · Repository home.** The node is on **GitHub**, while the platform moved to Forgejo. This is not
incidental: **verification requires GitHub Actions with npm provenance**, and `@n8n/scan-community-package`
resolves the attested *source* from that provenance (§5.2). A move to Forgejo would break the verification path
outright. `INTERPRETED`, but with high confidence: **staying on GitHub is now a technical requirement, not a
preference.** Worth writing into the CLAUDE.md so nobody "finishes the migration".

**P-6 · The 26 dead operation files (§7.4).** Delete, or declare them a staging area. Either is fine; leaving
them undeclared is what poisons every automated coverage claim.

**P-7 · Do we adopt the starter's release pipeline (§7.5)?** Small, mechanical, touches the release path. A
yes/no, not a research question.

**P-8 · 🔴 Should we ship an "oneAI Chat Model" sub-node?** New, and it came out of settling U-1 (§7.6). A
chat-model sub-node built on `@n8n/ai-node-sdk` would make OneAI selectable as the LLM behind *any* n8n AI Agent
— governance, audit and EU AI Act compliance included — rather than being one more resource in a CRUD node. It
ships in the same package (the same rule that permits a trigger alongside the main node, §6.2). Against it: the
SDK is explicitly in **preview** with an API that "may change without notice", and it would sharpen the V-4 /
"competes with paid features" exposure in P-3, since it puts us directly in n8n's AI stack. This is a strategy
call, and a more interesting one than the operation-porting question that started this work.

---

## §10 · Where our node is already fine — do not churn this

Written explicitly so that an agent set built from this document does not generate work where there is none.
Every row was checked against `origin/main` (v0.1.9 = npm `latest`), not the stale local checkout.

| Thing | Status | Why it's right |
|---|---|---|
| **Programmatic style** | ✅ Correct and explicitly sanctioned | We transform incoming data (binary upload, conditional second call, hand-rolled pagination, message assembly), which `DOC-LITERAL` says *requires* programmatic. Declarative would also forfeit full versioning. A rewrite would be the whole node for no gain. |
| **`peerDependencies: { "n8n-workflow": "*" }`** | ✅ **Mandatory** | `valid-peer-dependencies` requires exactly `"*"` and auto-fixes anything else. Do not pin. (§3.6 — this reversed an earlier draft.) |
| **No runtime `dependencies`** | ✅ | Verification requirement V-9 *and* the `no-runtime-dependencies` lint rule. |
| **`prepublishOnly`** | ✅ (narrowly) | `no-forbidden-lifecycle-scripts` bans `prepare`/`postinstall`/`prepublish` — **not** `prepublishOnly`. Correct, but one character from a violation. |
| **`n8n.strict: true` + untouched `eslint.config.mjs`** | ✅ | This *is* n8n Cloud eligibility (§7.5). Never edit the config; never flip `strict` to false to silence a lint error. |
| **Publishing with provenance from a GitHub Action** | ✅ | Already meets the May 2026 requirement, and the verification scanner functionally depends on it. |
| **MIT licence, scoped `n8n-nodes-` name, `n8n-community-node-package` keyword, `dist/` paths in the `n8n` block** | ✅ | All four are checked, three by lint rules. |
| **Credential shape** — `IAuthenticateGeneric` header bearer, `typeOptions.password`, a `test` request | ✅ | Byte-for-byte the documented pattern, and satisfies `credential-password-field` + `credential-test-required`. |
| **The node never reads `credentials.apiKey`** | ✅ **and this is the best security property we have** | Only `httpRequestWithAuthentication` touches the secret. Make it a standing assertion. |
| **`pairedItem` on every returned item** | ✅ | All 78 operation files. Required for programmatic nodes; enforced by `missing-paired-item`. This was deliberate work — don't undo it. |
| **`continueOnFail()` handling in `actions/router.ts`** | ✅ | Identical to the documented batch pattern, `pairedItem` included. (Only the bare re-throw's missing `itemIndex` is worth improving — §7.1.) |
| **`usableAsTool: true`** | ✅ | Expected; `node-usable-as-tool` is in `recommended`. |
| **No restricted globals or imports; no `eval`/`child_process`; no hardcoded secrets** | ✅ | Scanned every `.ts` under `nodes/` and `credentials/` on `origin/main`: zero hits. Keeps us Cloud-eligible. |
| **Resource/operation grouping** | ✅ | `resource-operation-pattern` warns above 5 operations without resources; we have 8 resources. |
| **Keeping `name: 'oneAi'` through the `OneAI` → `oneAI` rebrand** | ✅ **exactly right** | `displayName` is presentation, `name` is identity. n8n does the same (`Set.node.ts` is still `name: 'set'`). Whoever did that made the correct call; write it down so it stays made. |
| **`credentials.gatewayOnly` added as an optional boolean read via `=== true`** | ✅ | Additive credential field, `undefined` behaves as `false`. This is the template for future credential changes. |

**The real gaps, in priority order** — everything else in this document is context for these:

1. **U-7** — does the 0.1.9 `loadOptions` resource/operation change break panel discovery and AI-tool
   enumeration? (~1h, and it concerns code already published)
2. **U-10** — does a passed-through axios error leak the `Authorization` header? (~30 min)
3. **U-8** — does the node still work on n8n 2.x at all? (~2h)
4. **§3.5 step 1** — `version: 1` → `version: [1]`, and a decision on P-2. (one line + one owner call)
5. **V-12** — run `npx @n8n/scan-community-package @oneai-eu/n8n-nodes-oneai` and put it in CI. (one command)
6. **§7.4 / P-6** — resolve the 26 dead operation files before any drift check is built on a file listing.
7. **U-11** — the OneAI-spec drift check the earlier analysis identified as the actual product problem.

---

## §11 · What this means for the agent set

Not a design — the inputs a design needs, so nobody re-derives them.

- **Read `origin/main`, never the working copy.** §0.1. Every prompt opens with `git fetch`.
- **The gates are `n8n-node build`, `n8n-node lint` (44 rules, `recommended`/Cloud-strict), and
  `npx @n8n/scan-community-package` at release.** Not biome, not tsc-standalone, not vitest-by-default. §5.
- **A validator agent's checklist is the V-table (§1) plus the lint-rule table (§4.3) plus the compatibility
  table (§3.4).** All three are quoted, so it can cite rather than opine.
- **The security prompt is §4.5** — seven checks, plus an explicit "not applicable" list. Importing the connector
  security prompt wholesale is the failure mode to design against.
- **The live trace is a first-class phase, not an optional one** (§5.4), because three of the top four gaps are
  only observable in a running n8n, and `n8n-node dev` makes that one command.
- **The docs URLs to cite are `docs.n8n.io/connect/create-nodes/…`**, not `…/integrations/creating-nodes/…`.
- **Pin the corpus.** n8n's docs and lint rules move; this document is anchored at `n8n-docs@6f4b48e6` /
  `n8n 2.37.9` / `@n8n/node-cli 0.46.3` / `n8n-workflow 2.16.0`, 2026-09-03. **Re-verify §0 before trusting any
  version-bearing claim here**, and treat a changed version as a reason to re-read, not a reason to guess.
