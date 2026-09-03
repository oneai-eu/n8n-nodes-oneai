# Orchestration template — n8n-nodes-oneai

Copy into `docs/orchestration/<run-name>/MASTER-PROMPT.md`, fill the bracketed parts, delete what
does not apply. Everything unbracketed is there because leaving it out has cost a run before.

---

# <run name> — autonomous orchestration prompt

**Owner GO:** [full autonomy / stop at the architect gate / …]
**Deliverable:** [one sentence. What exists at the end that does not exist now.]

## Scope — what is in, and what is deliberately out

| # | In scope | Why |
|---|---|---|
| A | | |

**Out of scope, each with its reason — do not widen:**
- **[item]** — [why not now. "It is out because X" is the useful form; "not needed" is not.]

## Phase 0 — the drift check, always

```bash
node scripts/drift-check.mjs
```

🔴 If its **vacuity guard** fires, stop. A broken extractor prints a comfortable table, and two
analyses have already been wrong that way — one searched for a field name that does not exist and
reported 0 % coverage; one counted files, 29 of which are commented out of the router.

Record the numbers **before** the run so the "after" is comparable.

## Phase 1 — `node-architect` ⏸ GATE

Selection only. The question is never "what is missing" but *what workflow does this make possible
that was impossible before*.

Ends at a gate. [Who resolves it: the owner / the orchestrator, and on what basis.]

## Phases 2–6

`node-implementer` → `node-validator` + `node-security` **in parallel** → orchestrator re-audit →
commit → `node-trace` → `node-docs` → draft PR.

## Standing rules

- **Branch off `main`.** Never push to `main`. `gh pr create --draft` only; **never** `gh pr ready`.
- 🔴 **Never `npm publish`.** The hook refuses it. A release is the owner's, and it is irreversible.
- **English commits and PR bodies. No AI attribution anywhere** — grep your own text.
- 🔴 **Measure `origin/main`, not the local checkout**, and the **shipped** surface, not the files.
- 🔴 **Assert properties, not tokens.** `pairedItem` is present in every operation and names the
  wrong item; every check for the token is green on 65 broken files.
- **Falsify every test by mutation and COUNT** — expected-red vs actual-red, mismatches explained
  rather than rounded.
- **Read `nodes-base` for precedent; never vendor it.**
- **Report-first**: write to disk as each phase completes. A turn limit then costs nothing.
- Reports and prompts stay **untracked**.

## Environment

- devtest is `adminui-dev`; `n8n.oneai.de` resolves to the same machine.
- 🔴 `oneai-devtest-n8n` serves `n8n.oneai.de`; `-ralf` is a colleague's. Boot your own with
  `n8n-node dev`. Never `docker compose … --remove-orphans` there.
- **Credential authorisation (owner, 2026-09-03):** generate a **user API key** and a **gateway API
  key** on devtest as needed. Exercise both — they validate against different backends. Never print
  one; delete them afterwards and verify.
- 🔴 `/root/oneai` is parked on an unrelated branch: readable, never writable.

## Definition of done

- [ ] gates green, including 🔴 `npx @n8n/scan-community-package`
- [ ] drift check clean on tiers 1 and 3 (**path** and **shape**); tier 2 is information, not a failure
- [ ] shipped operation set is a **superset of the last release**, or the break is owner-ruled
- [ ] mutations counted, shortfalls explained
- [ ] traced on a real n8n against real OneAI, with what was **NOT-REACHED** named
- [ ] draft PR, English, no AI attribution
- [ ] `CLAUDE.md` / `AGENTS.md` updated if the run contradicted them
