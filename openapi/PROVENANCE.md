# `openapi.json` — provenance

Without this file every drift report is unfalsifiable: a "drift" finding only means something if you
can say *drifted from what*. Regenerate the snapshot and update every field below in the same change.

| | |
|---|---|
| **Source repository** | oneAI platform (`forgejo.onedeploy.dev/oneai/oneai`) |
| **Git ref** | `origin/main` |
| **Commit** | `2c29f06b21b164839345af849f6834fc1c4a5449` |
| **Commit date** | 2026-10-27T08:17:44+00:00 |
| **Commit subject** | `feat(agents): park unattended irreversible actions unless the org and the agent allow them, and audit both settings (#3046)` |
| **Snapshot taken** | 2026-10-27 |
| **Generator** | `npx tsx src/scripts/update-openapi.ts` (Yedra `app.build()`) |
| **Working tree** | clean - a detached `git worktree` at `origin/main`, nothing but `openapi.json` written |
| **SHA-256** | `ea880621a329d86808959ef27a49f455370f59a96c674e336188fb8b8cf494a0` |
| **Size** | 717 294 bytes |
| **Contents** | 311 paths / 395 operations |

## What changed against the previous snapshot

Previous: `45819b7dfa9f21f6cd7940a76422243a30215c6f`, 2026-09-04, 330 paths / 406 operations,
SHA-256 `87709448008567e4246db89adb1530b1261bf6db5677a23a78686608e4e43a71`.

**58 operations added, 69 removed.** The removals are the connectors that moved out of oneAI into
connector packages (their `/api/spaces/<provider>/...` setup calls and `/api/webhooks/<provider>`
receivers) and the retired `/api/integrations/substrate/...` and `/api/tools/self-approvals`
surfaces. The node calls none of them.

`scripts/drift-check.mjs` against this document found **one** failure on the shipped surface:
`project:update` sent `pinned`, which oneAI dropped when it replaced pins with per-user favorites
(oneAI #3396); `PUT /api/projects/{id}` is `additionalProperties: false`, so every call that set it
was rejected with a 400. Fixed in the same change as this snapshot.

## How this snapshot was taken

From a detached `git worktree` of the oneAI repository at `origin/main` after `git fetch`, with
`node_modules` symlinked and `.env` copied in, so the generator saw exactly the committed tree. The
worktree was removed afterwards.

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
