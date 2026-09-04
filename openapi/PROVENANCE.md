# `openapi.json` — provenance

Without this file every drift report is unfalsifiable: a "drift" finding only means something if you
can say *drifted from what*. Regenerate the snapshot and update every field below in the same change.

| | |
|---|---|
| **Source repository** | oneAI platform (`forgejo.infra.oneai.eu/oneai/oneai`) |
| **Git ref** | `origin/main` |
| **Commit** | `f2b70d0c8f28fab490e2db034609996cb8cfe2e6` |
| **Commit date** | 2026-09-03T15:18:59+00:00 |
| **Commit subject** | `feat/erp-csv-export (#2676)` |
| **Snapshot taken** | 2026-09-03 |
| **Generator** | `npx tsx src/scripts/update-openapi.ts` (Yedra `app.build()`) |
| **Working tree** | clean — `git status --porcelain` empty at generation time |
| **SHA-256** | `13048f5408af10ba09e687480f3b2859e11615a271cd77737e524318ba2d68a1` |
| **Size** | 655 241 bytes |
| **Contents** | 325 paths / 401 operations |

## How this snapshot was taken, and why not the obvious way

The machine's oneAI checkout at `/root/oneai` was **not** usable as the source. At the time of the
snapshot it was parked on an unrelated branch (`feat/invoke-api-governance`), **92 commits behind
`origin/main`**, with 155 dirty tracked files under `src/api/`. A spec generated from it would have
described neither `main` nor any released state — a baseline that looks authoritative and is not.
It also carried a stale `openapi.json` (2026-08-19), which is gitignored there and is a local
scratch artifact, not a reference.

That checkout is also read-only for this work, so `git checkout` / `git worktree` on it were out.

The snapshot was therefore generated from a **`git clone --shared` of that checkout into a scratch
directory, checked out at `origin/main`**, with `node_modules` symlinked and `.env` copied in. A
shared clone reads the source's object store and writes nothing to it; `/root/oneai` was verified
byte-unchanged afterwards (same branch, same HEAD, same `openapi.json` mtime, no new worktrees).

One env var (`WEBER_KEY`) had to be supplied as a placeholder in the *clone's* `.env`, because
`origin/main` requires it and the older `.env` predates it. It affects nothing in the emitted
document: `app.build()` only walks the route tree.

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
