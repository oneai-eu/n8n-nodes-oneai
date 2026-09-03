# n8n-nodes-oneai — Claude Code Instructions

The OneAI community node for n8n. **A published, certified npm package** that other people install
into their own n8n instances.

🔴 **Do not carry OneAI's rules over.** This repository looks like the OneAI platform repository and
almost every hard rule is different. The table below is not trivia — it is the list of habits that
will do the wrong thing here.

| | OneAI platform | **here** |
|---|---|---|
| Host | Forgejo — **`gh` does not work** | **GitHub — `gh` is the right tool** |
| Draft PRs | a `WIP: ` title prefix by convention | native: `gh pr create --draft`, `gh pr ready` |
| Gates | `pnpm format && check && typecheck`, vitest | **`n8n-node lint` / `n8n-node build`** |
| Blast radius | internal deployments | 🔴 **the public npm registry** |
| Type source | `src/openapi.gen.ts` in-repo | OneAI's `openapi.json` — see below |
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
| **no `package-lock.json` in the repository** | it is `.gitignore`d (line 3) — a deliberate act, not an oversight. CI runs `npm install`, not `npm ci` |
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
| **package version** (`0.1.9`) | npm semver, read by the operator who upgrades | **none directly** — the upgrade replaces the code every existing workflow runs |
| **node `typeVersion`** (`version` in `OneAi.node.ts`) | stamped into every saved workflow node | **everything** — the only thing that pins old behaviour |

Our node declares `version: 1` as a **plain number**, so every OneAI node anyone has ever placed is
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

## Types come from OneAI's OpenAPI spec

**Owner/Oli rule: follow the spec's types strictly. No `as any`. Do not reach for `unknown` either —
derive the real type.**

The code satisfies this literally today (`as any`: 0, `: any`: 0, `tsconfig` strict). The gap is
elsewhere and a grep for `any` will never find it:

- 🔴 **`IDataObject` appears 31 times.** It is n8n's own loose record type and cannot be banned
  outright, but it is how untyped payloads actually enter this codebase.
**The spec is now committed** at `openapi/openapi.json` (325 paths / 401 operations) with an
`openapi/PROVENANCE.md` naming the OneAI commit it was taken from and its SHA-256. Without that
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

---

## 🔴 Presence is not correctness

The rule this repository exists to remember. On 2026-09-03 we found that **`pairedItem` is set in
every operation and points at the wrong item** — the `map((item, index) => …)` callback shadows the
`index` parameter that names the input item, so rows report a lineage that was never real. 57 of 60
source files; 65 files in the published `0.1.9`.

Every check for the *token* was green. n8n's own guidance snippet carries the same shadowing, and we
adopted it verbatim.

Three things follow, and they belong in every validator rule written here:

1. **Assert the property, not the token.** "`pairedItem` is set" passes on 65 broken files. "`pairedItem` names the input item this row came from" does not.
2. **A snippet from an authority is evidence about a shape, not a licence to skip thinking about our own case.** Theirs is right for one-input-to-one-output; most of our operations return many rows from one item.
3. **Measure `origin/main`, never a stale checkout.** Two analyses on that day reported the wrong thing because the local tree was four commits behind and npm `latest` was two releases ahead.

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
  transport/index.ts     the single HTTP seam — httpRequestWithAuthentication only
  modes.ts               (0.1.9) the resource/operation registry
credentials/OneAiApi.credentials.ts
scripts/drift-check.mjs  spec ↔ node surface, on shapes
docs/                    research, findings, orchestration — never shipped
```

🔴 **29 operation files are commented out** of both `router.ts` and the node. They are in the
repository, no lint rule sees them, and **any check that counts files instead of the shipped surface
counts them**. The shipped surface on `origin/main` is **49 operations across 8 resources**, issuing
58 distinct API calls — measured by `scripts/drift-check.mjs`, which parses the router rather than
the directory. (Earlier hand counts said 67, then 51. Both were wrong, in the same direction.)

---

## Gates

```bash
npm run lint          # n8n-node lint — n8n's own rule set
npm run build         # n8n-node build
npx tsc --noEmit      # strict, noImplicitAny
node scripts/drift-check.mjs        # spec ↔ shipped surface, on shapes
```

`.mjs` and not `.ts` on purpose: this repository has no lockfile and a fresh clone has no
`node_modules`, and CI pins Node 22 where type-stripping a `.ts` entry point is not dependable. A
checker that silently stops running is worth less than none.

🔴 **`npx @n8n/scan-community-package` is the gate verification actually depends on**, it runs a
*newer* rule set than local lint, and **we have never run it.** Run it before claiming a package is
certification-ready.

**There is no unit-test convention in n8n**, and n8n's own testing page amounts to "run it in a local
n8n, and lint it". vitest is anticipated by the rule docs, so structural tests are permitted — and
they are what catches the `pairedItem` class, which neither lint nor a happy-path trace will show.

---

## Live trace

Both halves are ours, so a trace can be end-to-end and real.

- `n8n-node dev` compiles the node and boots a **local** n8n with it — the supported path, one
  command. (Manually: `npm run build` → `npm link` → `npm link <package>` in `~/.n8n/custom` → `n8n start`.)
- OneAI to trace against: **devtest**. `n8n.oneai.de` resolves to the same machine.
- 🔴 **`oneai-devtest-n8n` serves `n8n.oneai.de` and `oneai-devtest-n8n-ralf` belongs to a colleague.**
  Boot your own instance; do not touch theirs. Never `docker compose … --remove-orphans` on that host.

**Owner authorisation (2026-09-03):** generate whatever credentials a trace needs on devtest —
a **user API key** and a **gateway API key**. Both classes matter because they are validated
differently: `oai_` against the hub via `/api/auth/check`, `oai-gk_` against the OneAI Gateway. A
trace that exercises one leaves the other unproven.

Credential discipline is unchanged: never print a key, never let one reach a report, log, fixture or
commit, delete what you created afterwards and **verify the deletion**.

---

## What belongs in the node

**Not API coverage. Composability.** The measure is what a workflow author can build *with the rest
of n8n* that was impossible before — this node's worth is as a junction in a graph, not as a mirror
of an API. "14% of 409 endpoints" is not a deficiency to close.

The worked example, from Oli: **OneData (datasets / tables) is the most important missing feature**,
because hundreds of other n8n nodes can pull data out of other apps and this node is what lands it in
a OneAI dataset.

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
source from the OneAI repository — four files of n8n node source among them — because foreign code
under a foreign licence does not belong in our tree, on a branch or in a PR. Cite it by URL and
commit; archive anything you need outside the repository.

---

## Reference documents

| | |
|---|---|
| `docs/RESEARCH-2026-09-03-n8n-node-development.md` | the evidence base: versions, package bars, versioning, credentials, lint, triggers. Every claim classed and sourced |
| `docs/FINDING-2026-09-03-paireditem-shadowing.md` | the open `pairedItem` defect |
| `docs/N8N-DEV-FEEDBACK-certification.md` | n8n's three certification items — **closed**, kept as guidance |
| `docs/N8N-DEV-FEEDBACK-oli-agent-guidance.md` + `ANALYSIS-…` | Oli's rules, checked against the code |
| `.claude/agents/AGENTS.md` | the agent set and how a run is orchestrated |

Phase reports and orchestration prompts are **working material, never committed** — the same rule the
platform repository learned the hard way.
