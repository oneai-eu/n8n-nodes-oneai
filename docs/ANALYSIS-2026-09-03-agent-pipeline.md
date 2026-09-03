# n8n-nodes-oneai — first analysis: can the OneAI agent pipeline maintain this node?

**Date:** 2026-09-03 · **Status:** analysis only, nothing built, nothing decided.
**Origin:** owner question — OneAI ships new capabilities fast (OneData, Canvas, Browser Session, …) and
this node cannot keep up. Could the six-agent pipeline, orchestration-prompt template, autonomous hooks and
live-trace agent that were built for the connector work be applied here?

**Short answer: yes, and this is a *better* fit than the connector work — but the pipeline has to be
reshaped rather than copied, and the real problem is not "port the missing features".**

---

## 1. Where the node stands today

| | |
|---|---|
| Package | `@oneai-eu/n8n-nodes-oneai` **v0.1.8** (published, certified) |
| Repository | **`github.com/oneai-eu/n8n-nodes-oneai`** — GitHub, *not* the Forgejo instance the platform moved to |
| Last commit | **2026-03-24** — over five months stale |
| History | 28 commits, largely hand-written |
| Surface | **67 operations across 14 resources** |
| Toolchain | `@n8n/node-cli` — `n8n-node build` / `n8n-node lint` enforce n8n's own conventions |
| Transport | one helper, `httpRequestWithAuthentication`; **base URL comes from the credential**, so it already points at any instance including devtest |
| Credential | `generic` auth: OneAI URL + API key |

**Operations per resource:** space 17 · team 7 · project 6 · member 6 · artifact 6 · chat 5 · apiKey 5 ·
organization 4 · stats 2 · reference 2 · complianceLlm 2 · auditLog 2 · ai 2 · misc 1

**Absent, and named by the owner as the gap:** OneData · Canvas · Browser Session.

---

## 2. Why this is a better fit than the connector pipeline

The most expensive machinery in the connector pipeline exists because **a third party owns the API**:
archive their documentation, sha256-index it, classify every claim as `DOC-LITERAL` / `INTERPRETED` /
`LIVE-PROVEN`, escalate every `INTERPRETED` write shape before shipping. All of that is a defence against a
contract we do not control and cannot test cheaply.

**Here the API is ours.** It is generated into `src/openapi.gen.ts` from the Yedra endpoint definitions and
lives in a tree on the same machine (`/root/oneai`). The evidence apparatus largely collapses into a single
mechanical question: *does the node's surface agree with the generated spec?*

The live-trace phase gets **stronger**, not weaker: both sides are ours. A trace can build a real n8n
workflow on the devtest instance, execute it against devtest OneAI, and assert on the result end to end —
something the GitLab trace could only approximate because the provider was someone else's.

---

## 3. The real problem is DRIFT, and drift between two artefacts we own is computable

A one-time port fixes today and rots again by spring. The node did not become stale through neglect of a
single feature — it fell behind a platform that ships continuously.

What actually solves it is a **standing delta check**: read the OpenAPI spec, read the node's operation
surface, report what OneAI exposes that the node does not. That is agent-shaped today and CI-shaped later.

**This is the difference between "we ported it" and "it cannot silently fall behind again", and it should
be built first — before any feature work.** It also produces the input the architecture phase needs.

---

## 4. How the six phases map

| Phase | Transfers? | What changes |
|---|---|---|
| **architect** | yes | Input is our own generated spec, not archived third-party docs. Its hardest job becomes **selection** (§5). |
| **implementer** | cleanly | One file per operation is a very regular shape; the router pattern is already established. |
| **validator** | reshaped | Gates are `n8n-node lint` + `n8n-node build` + spec conformance — **not** biome/tsc/vitest. This repo has no test framework today; check before assuming one. |
| **security** | **mostly not** | This is a **client**. Credentials live in n8n's credential store; the threat model is workflow authors and instance operators, not our tenants. Our `connector-security` axes (multi-tenancy scoping, confirmation bypass, SSRF from our egress) largely do not apply. A new, smaller prompt is needed — credential handling, error leakage into workflow output, and what a node returns into a workflow context. |
| **trace** | **strongest here** | Real workflow on `n8n.oneai.de` → real call → devtest OneAI → assert. Both ends ours. |
| **docs** | yes | Plus the README/marketing surface a published package carries. |

---

## 5. 🔴 The judgement that matters most: what NOT to expose

OneAI's API is far larger than 67 operations. **A node that mirrors an entire API is unusable in n8n.**
Workflow authors need *task-shaped* operations — "run a chat", "upload into a space", "query a OneData
table" — not CRUD over every resource.

So the architecture phase's hardest question is not "what is missing" but **"what belongs in a workflow
node at all"**. That is a product decision and it should be taken with the owner, not inferred by an agent
from the spec. Mechanically porting every new endpoint would make the node worse while making the delta
check green.

---

## 6. Constraints the connector work never had

1. **Published and certified.** Existing users have workflows pinned to `v0.1.x`. Backwards compatibility
   is suddenly real: renaming an operation or a parameter breaks live automations. There is a release path
   (npm) and n8n's own review conventions, enforced by `n8n-node lint`.
2. **On GitHub, not Forgejo.** Either deliberate (public npm package) or an oversight from the migration.
   It changes the PR flow — the platform repo's "`gh` does not work" note is about Forgejo and does not
   automatically apply here.
3. **No test framework in the repo** (`scripts` are build/dev/lint only). The connector doctrine's
   mutation-counted vitest discipline has nothing to attach to yet. Either a framework is introduced —
   a real decision, not a side effect — or verification leans on the live trace, the way `oneai-worker`'s
   `scripts/test-*.ts` convention does.

---

## 7. Open questions for the owner — none of these should be guessed

1. **Trace target:** is `n8n.oneai.de` the instance, and is this node installed there? (devtest also runs
   `oneai-devtest-n8n` and `oneai-devtest-n8n-ralf` containers, which are **not** in its compose file.)
2. **Release path:** npm publish on tag, or manual? Who owns the npm organisation?
3. **Compatibility:** may `v0.2` break existing workflows, or must it stay additive?
4. 🔴 **Scope:** all of OneData / Canvas / Browser Session, or a deliberately cut subset? — see §5.
5. **Repository home:** stay on GitHub, or move to Forgejo with everything else?

---

## 8. Suggested order, if this goes ahead

1. **Delta check first** — spec versus node surface. Cheap, mechanical, and it produces the input for
   everything after it.
2. **Owner conversation on scope** (§5) — what belongs in a workflow node, what does not.
3. **Then** an agent set: architect / implementer / validator / trace / docs, with a *new* security prompt
   written for a client rather than reused from the connector pipeline.
4. Live trace on the real n8n instance against devtest OneAI.
5. Release and compatibility policy decided **before** the first breaking change, not after.
