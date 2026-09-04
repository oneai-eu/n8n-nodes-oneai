# Oli's guidance, checked against the code

Companion to `N8N-DEV-FEEDBACK-oli-agent-guidance.md`. Every point below was verified against the
repository rather than paraphrased. Where the code already satisfies a rule that is said too, so
nobody churns it.

🔴 **Measure `origin/main`, not the local checkout.** The local tree is 4 commits behind, and the
first pass of this analysis wrongly reported `oai_` as absent because of it. npm `latest` is
**0.1.9 (2026-07-16)**; the local HEAD is **0.1.8 (2026-03-24)**.

---

## 1. Types from `openapi.json`, no `any`, avoid `unknown`

**Already honoured, literally.** `as any` → **0**. `: any` → **0**. `as unknown` → **1**.
`tsconfig.json` has `strict: true` and `noImplicitAny: true`.

**But the rule is not achievable as written, for two reasons.**

🔴 **There is no `openapi.json` in this repository.** The type source the rule names does not exist
here. Today an author would have to reach into a checkout of `/root/oneai` and generate it — so
"follow the types" is a review instruction that nothing can enforce, and which silently depends on
whichever oneAI checkout happened to be on the machine.

🟡 **`IDataObject` appears 31 times**, and it is how untyped payloads enter a codebase that contains
no `any`. It is n8n's own loose record type, so it cannot be banned outright — but it is the actual
gap the rule is aiming at, and a rule that greps for `any` will never see it.

**What would make the rule real:** commit a spec snapshot *and* generate types from it into the
repo, the way `/root/oneai` generates `src/openapi.gen.ts`. "Follow the types" then becomes a
property the compiler enforces on every build, instead of a habit a reviewer has to police. It also
makes drift **diffable over time**, and removes the "measured against which oneAI checkout?"
ambiguity that would otherwise poison every drift report.

**Note on `unknown`:** normally `unknown` is the *safe* alternative to `any`, so "avoid unknown"
reads oddly out of context. Read together with the first clause it is clearly stronger than a style
preference: do not dodge typing at all — derive the real type from the spec rather than reaching for
either escape hatch.

## 2. Draft PRs only, English, no Claude additions, never push directly

Same discipline as the oneAI repository, **different mechanics**, and the difference will trip an
agent that carries oneAI habits over:

| | oneAI (Forgejo) | this repo (GitHub) |
|---|---|---|
| PR tooling | REST API; **`gh` does not work** | 🔴 **`gh` is the right tool** |
| draft state | a `WIP: ` title prefix by convention | native drafts: `gh pr create --draft`, `gh pr ready` |

"No Claude code additions" is the standing rule: no `Co-Authored-By`, no 🤖, no "Generated with", no
session link — in commits, PR bodies and files alike.

## 3. Read best practice from `n8n-io/n8n`, `packages/nodes-base/nodes`

An explicit authority ranking, and it belongs in the agents' substrate: **n8n's own shipped nodes >
n8n's documentation > everything else.** Shipped code beats prose because it is what the team
actually maintains.

🔴 **Read it; do not vendor it.** On 2026-09-03 we removed 18 648 lines of third-party source from
the oneAI repository — including four files of n8n node source — because foreign code under a
foreign licence does not belong in our tree, on a branch or otherwise. The agent set must cite
`nodes-base` by URL and commit, and archive anything it needs **outside** the repository. Making the
same mistake here, two days after fixing it there, would be hard to defend.

## 4. `oai_` key, no sign-in / OAuth. Core surface: **Chatting (very important)**, Spaces, Datasets, Audit Logs

Present and correct on `origin/main` and in the published 0.1.9. One detail the guidance flattens
and the architect must not:

**There are two key classes, validated against different backends.**

> *"Gateway-plan keys start with `oai-gk_` and are validated against the oneAI Gateway; all other
> keys (`oai_`) are validated against the hub."* — `credentials/OneAiApi.credentials.ts:36`

Hub keys are checked against `/api/auth/check`. A rule written for `oai_` alone would mis-handle
gateway-plan users.

**What this rules out**, read against the measured drift: `auth` (21 endpoints), `passkeys` (3),
`subscription`/Stripe (25) and `scim` (13) are out of scope by this instruction alone — 62 of the
351 uncovered endpoints, settled without further discussion.

## 5. After each new function, re-check *the rest* against `openapi.json` — request bodies change

🔴 **This is a stronger check than the one built on 2026-09-03, and the difference matters.**

That check compared **method + path**. Oli is asking for the **shape** as well: an endpoint whose
path is unchanged but whose request body gained a required field, or renamed one, passes a path-level
check and fails at runtime.

It is the same lesson as the `pairedItem` finding on the same day: *presence is not correctness*.
A path-level drift report is green while the payload is wrong, exactly as a `pairedItem` grep is
green while the lineage is wrong.

So the flagship script is not "which endpoints are missing" but **"for every operation we ship, does
its request still match the spec's schema"** — and it should run over the whole surface after any
change, as instructed, not only over what was touched.

## 6. The architect thinks as an n8n **workflow developer**

The selection principle, and the answer to the question this analysis previously flagged as
owner-only:

> value = what a workflow developer can **compose** with the rest of n8n — not API coverage.

The worked example is the argument: **oneData (datasets / tables)** is named the most important new
feature *because* hundreds of other n8n nodes can pull data from other apps, and this node is what
lands it in a oneAI dataset. The node's worth is as a junction in a graph, not as a mirror of an API.

That reframes the whole exercise. "14 % of 409 endpoints" is not a deficiency to close; the question
for each endpoint is whether it makes a *workflow* possible that was not possible before.

---

## What is still open — and Oli's notes do not settle these

| | |
|---|---|
| 🔴 **May a release break existing workflows?** | Point 5 implies changing an existing operation's request shape is expected and fine. That is **internal**. It does not answer the workflow-visible case: renaming an operation or a parameter. Per the research, `version` is a plain number, so every release lands on `typeVersion: 1` in every existing workflow; a renamed **parameter** fails **silently**. Still an owner ruling. |
| **Test framework, or lean on a live trace?** | Not addressed. n8n publishes no unit-test convention, but the rule docs anticipate vitest. The `pairedItem` finding argues for structural tests: it is precisely the class of defect no lint rule and no live trace of the happy path would surface. |
| **Which oneData / Chat operations, concretely** | The direction is given; the operation list is design work for the architect phase. |
