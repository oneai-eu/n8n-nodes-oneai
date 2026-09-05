# `openapi.json` — provenance

Without this file every drift report is unfalsifiable: a "drift" finding only means something if you
can say *drifted from what*. Regenerate the snapshot and update every field below in the same change.

| | |
|---|---|
| **Source repository** | oneAI platform (`forgejo.infra.oneai.eu/oneai/oneai`) |
| **Git ref** | `origin/main` |
| **Commit** | `45819b7dfa9f21f6cd7940a76422243a30215c6f` |
| **Commit date** | 2026-09-04T13:24:28+00:00 |
| **Commit subject** | `feat(dynamics-sales): the data plane — the HTTP seam, the record renderer, and the pair predicates (#2670)` |
| **Snapshot taken** | 2026-09-04 |
| **Generator** | `npx tsx src/scripts/update-openapi.ts` (Yedra `app.build()`) |
| **Working tree** | clean — `git status --porcelain` empty at generation time |
| **SHA-256** | `87709448008567e4246db89adb1530b1261bf6db5677a23a78686608e4e43a71` |
| **Size** | 666 370 bytes |
| **Contents** | 330 paths / 406 operations |

## What changed against the previous snapshot

Previous: `f2b70d0c8f28fab490e2db034609996cb8cfe2e6`, 2026-09-03, 325 paths / 401 operations,
SHA-256 `13048f5408af10ba09e687480f3b2859e11615a271cd77737e524318ba2d68a1`.

**Five operations added, none removed, and `scripts/drift-check.mjs` is clean against the new
document** — so nothing on the shipped surface moved.

```
GET  /api/agent-definitions/schedules              List every scheduled trigger across the org's agents
POST /api/spaces/businesscentral/companies         List companies in a Business Central environment
POST /api/spaces/businesscentral/environments      List available Business Central environments
POST /api/spaces/{spaceId}/files/rename            Rename a file within its folder
POST /api/webhooks/businesscentral/{token}         Receive Business Central change notifications
```

Two notes for whoever reads this next:

- 🔴 The new `POST /api/webhooks/businesscentral/{token}` is a **receiver**, like the other eleven.
  It does not change the conclusion in `docs/ANALYSIS-2026-09-04-v0.3.0-candidates.md` that a
  webhook-based trigger node is impossible — it strengthens it.
- `POST /api/spaces/{spaceId}/files/rename` is new and sits **directly beside the file operations
  v0.3.0 is about to add**. It was not part of the owner's ruled scope; it is flagged for the
  architecture phase to rule on rather than folded in silently.

## How this snapshot was taken

Same constraint as last time, re-verified rather than assumed: the machine's oneAI checkout at
`/root/oneai` was on `feat/invoke-api-governance` with **342 dirty tracked files**, so a spec
generated from it would have described neither `main` nor any released state.

The snapshot was generated from a **`git clone --shared` of that checkout** into a scratch
directory, with `node_modules` symlinked and `.env` copied in. A shared clone reads the source's
object store and writes nothing to it.

**Difference from the 2026-09-03 procedure:** the clone's `origin` was re-pointed at Forgejo and
`git fetch origin main` was run **inside the clone**, so the ref came from the server rather than
from whatever the local checkout had last fetched. That keeps the write confined to the clone while
removing "the local checkout's `origin/main` might be stale" as an unstated assumption. It happened
to agree — but agreeing and being checked are different things.

`WEBER_KEY` was again supplied as a placeholder in the *clone's* `.env`. It affects nothing in the
emitted document: `app.build()` only walks the route tree.

**`/root/oneai` was verified unchanged afterwards** — branch, HEAD, dirty-file count, worktree count
and the mtime of its own scratch `openapi.json` all identical to the values recorded before the
clone.

## Regenerating

```bash
# from a CLEAN checkout of oneai at the ref you want to measure against
npx tsx src/scripts/update-openapi.ts     # writes ./openapi.json
cp openapi.json <this repo>/openapi/openapi.json
# then update every row of the table above, including the hash
```

The check refuses to run against a spec with zero paths, and warns loudly below a plausible floor —
see the vacuity guards in `scripts/drift-check.mjs`. It cannot, however, detect that a *valid* spec is
simply old. That is what the commit and date above are for, and why they are not optional.
