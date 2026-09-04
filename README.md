# n8n-nodes-oneai

A community node for [n8n](https://n8n.io/) that integrates with the [oneAI](https://oneai.eu) platform — an AI hub providing access to multiple AI models and collaboration features.

The point of the node is composition: it is the junction where the output of any of n8n's hundreds of other nodes becomes oneAI data — a dataset row, a file in a space, an artifact — and where an AI answer becomes the input of the next node in a workflow. It is not a mirror of the oneAI API, and it does not try to be.

## Installation

On any n8n instance with community nodes enabled, the oneAI node is offered in the nodes panel: search for **oneAI** and install it from there.

You can also install it explicitly under **Settings → Community nodes → Install**, using the package name `@oneai-eu/n8n-nodes-oneai`.

## Authentication

This node uses **Bearer Token** authentication via an API key.

To configure credentials in n8n:

| Field            | Description                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **oneAI URL**    | Base URL of your oneAI instance (e.g. `https://hub.oneai.eu`)                                 |
| **API Key**      | Your API key, generated from your oneAI hub settings                                          |
| **Gateway Only** | Show only the oneAI Gateway (inference) features and hide the hub resources. Off by default.  |

Two classes of key exist and the credential test picks its endpoint from the prefix: keys starting with `oai-gk_` are Gateway-plan keys and are validated against the oneAI Gateway (`/api/openai/v1/models`); every other key (`oai_`) is validated against the hub (`/api/auth/check`).

Turning **Gateway Only** on hides the hub-only resources. A workflow built against the hub and then switched to a gateway credential may need its resource re-selected.

## Supported Resources & Operations

**75 operations across 11 resources.** The tables below are derived from `nodes/OneAi/modes.ts`, the same file the node's **Resource** and **Operation** dropdowns are built from, and they follow the order the dropdown shows. Names and descriptions are the ones the dropdown shows, verbatim. Operations that exist as source files but are not dispatched are not listed here, because they ship to nobody.

### AI (8 operations)

Inference through the oneAI Gateway: chat, images, speech, embeddings, transcription. Available with both key classes.

| Operation                   | Description                                      |
| --------------------------- | ------------------------------------------------ |
| Create Embedding            | Generate vector embeddings for text              |
| Create Response             | Send a message to an AI model and get a response |
| Edit Image                  | Edit an existing image from a text prompt        |
| Generate Image              | Generate an image from a text prompt             |
| Generate Speech             | Synthesize speech audio from text                |
| List Available AI Models    | List all available AI models                     |
| List Available Image Models | List all available image generation models       |
| Transcribe Audio            | Transcribe an audio file to text                 |

**Create Response input modes:**
- **Messages** — user-friendly role/content fields
- **JSON** — full control for complex conversations, images, etc.

**Create Response options:** Reasoning Effort, a time zone for timestamp formatting, and **Chat Association** — route the message through an existing oneAI chat so it carries that chat's context and history. With association off, oneAI creates a chat in your personal project for the call.

**Create Embedding** takes either a single text or a JSON array of texts, and offers an encoding format.

### Artifact (7 operations)

Hub artifacts — markdown, PDFs, presentations, distilled documents — inside spaces.

| Operation     | Description                                                   |
| ------------- | ------------------------------------------------------------- |
| Create        | Create an artifact in a space, optionally from a chat message |
| Delete        | Delete an artifact from a space                               |
| Export PDF    | Export an artifact as a PDF                                   |
| Export PPTX   | Export a presentation artifact as a PPTX file                 |
| Get Markdown  | Get the markdown content of an artifact                       |
| List All      | List all artifacts with optional filtering                    |
| List by Space | List artifacts in a specific space                            |

**Export PDF** and **Export PPTX** are siblings: both fetch the rendered file from oneAI and write the bytes into a binary property, so the result can go straight into an email, a file-storage node or a Convert node. PPTX only produces a file for an artifact oneAI can render as a presentation.

### Audit Log (4 operations)

The compliance record oneAI keeps for EU AI Act purposes: which pattern matched a request, what the compliance layer did about it, and — where it held the request — an admin's verdict on it.

| Operation | Description                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export    | Export audit logs as a ZIP archive holding one CSV or JSON file. The columns are chosen per export, and all of them are included by default.        |
| Get       | Get an audit log by ID                                                                                                                             |
| List      | List audit logs with optional filtering                                                                                                            |
| Review    | Record an admin verdict on a log the compliance layer flagged, blocking or unblocking the request it held                                           |

**List** filters on **Origin** (nine values), **Risk Level**, **Since** and **User ID**. Two things about it were measured against a live instance rather than read from the spec:

- **`Since` is exclusive.** A log whose `createdAt` is exactly the value passed is *not* returned. That is the behaviour a scheduled poll wants: store the newest `createdAt` you saw, pass it back on the next tick, and nothing is read twice or skipped.
- 🔴 **The API caps a page at 30 rows and clamps silently** — it does not reject a larger request, it just returns 30. The node therefore keeps reading pages until **Limit** is satisfied. Releases up to and including `0.2.0` sent the limit straight through, so a workflow asking for 50 received 30 and was told nothing.

**Review** submits `block` or `unblock` on a log the compliance layer held, with an optional review note. It is an approval, it is admin-only on the oneAI side, and its outcome defaults to `block` — a half-configured node declines a held request rather than approving it. See [What an AI agent can do with this node](#what-an-ai-agent-can-do-with-this-node) before you connect this node to an AI Agent.

**Export** writes the archive into a binary property, so n8n's own **Compression** and **Extract from File** nodes open it without a second tool. All ten columns are on by default, because an audit export is opened to answer who did what; three of them — **User ID**, **Matched Text** and **Reasoning** — carry personal data or reproduce the content that triggered a pattern, and deselecting them is one click.

🔴 **`Export` does not currently work against oneAI.** On the oneAI build tested on 2026-09-04, `POST /api/audit/logs/export` answers **HTTP 500** for every request shape — a database defect on the oneAI side (`column reference "org_id" is ambiguous`) that affects every caller, not only this node. The operation is implemented against the published API contract and its archive was proven to open in the Compression node against a local stub, but it has never returned a real archive. It is reported to the oneAI API owners.

### Chat (10 operations)

Create and manage AI chat conversations in the hub, and get the files and images a chat produced back out of it.

| Operation           | Description                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create              | Create a new chat                                                                                                                                                              |
| Delete              | Delete a chat                                                                                                                                                                  |
| Export              | Export a chat as a Markdown document                                                                                                                                           |
| Get                 | Get chat history                                                                                                                                                               |
| Get Blob            | Download an image or file that a chat produced, as binary data. Get returns the blob IDs, on the parts of its assistant messages.                                               |
| Get Blob URL        | Generate a pre-authenticated URL for a chat blob. The link is signed and time-limited, needs no oneAI credential, and is stored in the execution data.                          |
| List                | List chats with optional filtering                                                                                                                                             |
| Rate Message        | Rate an assistant message thumbs up or down. Removing a rating is not part of this node, although the API supports it.                                                          |
| Save Blob to Space  | Save a chat blob into a space as a file, without moving the bytes through n8n                                                                                                  |
| Update              | Update chat details (rename, switch branch, or set persona/agent)                                                                                                              |

🔴 **A chat lives in a space, and only in a space whose provider is `Project`.** Passing any other space ID — an oneAI Storage space, a oneData space — is rejected with `Chats can only be created in projects.` **List** filters by space ID for the same reason.

**Where a blob ID comes from.** `Chat > Get` returns the whole chat as **one item**, with the blob parts on its assistant messages, so reaching a blob ID takes a Split Out node (or a `flatMap` expression) between `Get` and the blob operations. `Chat > List` is not a discovery path: its `blobId` sits under `lastUserMessage.parts`. The chat that produced an image is the one `AI > Create Response` returns a `chatId` for.

The three blob operations differ in where the bytes end up, not in what they fetch:

- **Get Blob** brings the bytes into n8n as binary data. Pass the blob's **MIME Type** from `Get`; the default is `application/octet-stream`, which is honest about unknown bytes but gives n8n no preview and no file extension.
- **Get Blob URL** returns a signed link instead. Measured live: the signature is enforced, the link expires **one hour** after it is minted, and it needs no oneAI credential at all — so anyone who can read the execution can fetch the blob until it expires. The API answers with a *relative* path; the node emits it verbatim as `url` and adds `absoluteUrl`, resolved against the credential's base URL, which is the one a Slack message or an HTTP Request node can use.
- **Save Blob to Space** keeps the bytes inside oneAI: they move server-side, so a large file never passes through n8n at all, and the next embedding run picks it up.

**Export** produces the chat as Markdown. Its **Include Redacted Values** switch is off by default and the flag is sent only when it is on; turning it on returns the original values oneAI's compliance redaction removed, into the workflow output and therefore into the execution record.

### Compliance Pattern (5 operations)

Content policies for the EU AI Act: the default patterns oneAI ships, plus your organization's own.

| Operation   | Description                                 |
| ----------- | ------------------------------------------- |
| Create      | Create a custom compliance pattern          |
| Delete      | Delete a custom compliance pattern          |
| Edit        | Edit a custom compliance pattern            |
| List        | List default and custom compliance patterns |
| Set Enabled | Enable or disable a compliance pattern      |

### Dataset (6 operations)

oneData tables inside a space: schema, CSV import and export. A dataset lives in a space whose provider is **oneData (Data Tables)**, which `Space > Create` can create.

| Operation     | Description                                                                            |
| ------------- | -------------------------------------------------------------------------------------- |
| Create        | Create an empty dataset with a typed schema                                            |
| Export CSV    | Export a whole dataset as a CSV file                                                   |
| Import CSV    | Bulk-append the rows of a CSV file to a dataset                                        |
| List          | List the datasets in a space with their columns and row counts                         |
| List Spaces   | List the spaces that hold datasets, to get a space ID for the other dataset operations |
| Update Schema | Add, drop or rename a dataset's columns                                                |

**List Spaces** exists so a workflow can discover its datasets instead of carrying a space ID pasted in by hand. It lists only the spaces whose provider is oneData — the provider is pinned by the operation, not offered as a parameter, because an author who wants the other providers wants `Space > List` — and every item carries a top-level `spaceId`. That is exactly the input `Dataset > List` takes, so `List Spaces → List → Dataset Row > Append` composes with no glue node between the steps: n8n's own item loop fans the middle step out over every space.

Column types are DuckDB types: `BIGINT`, `BOOLEAN`, `DATE`, `DOUBLE`, `JSON`, `TIME`, `TIMESTAMP`, `TIMESTAMPTZ`, `UUID`, `VARCHAR`.

### Dataset Row (5 operations)

Rows in a oneData table. See [Working with datasets](#working-with-datasets) below for the one choice that matters.

| Operation   | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| Append      | Append one row per input item and return each new row ID         |
| Append Many | Append every input item in a single CSV request, without row IDs |
| Delete      | Delete rows from a dataset by their IDs                          |
| List        | List a dataset's rows, each with its row ID                      |
| Update      | Update named columns of one row by its ID                        |

### Miscellaneous (1 operation)

| Operation            | Description                                           |
| -------------------- | ----------------------------------------------------- |
| Check Authentication | Check the authenticated user and return their details |

### Project (6 operations)

| Operation            | Description                                  |
| -------------------- | -------------------------------------------- |
| Archive              | Archive a project                            |
| Get                  | Get a project by ID                          |
| Instantiate Template | Create a new project from a project template |
| List                 | List all projects                            |
| Unarchive            | Restore a project from the archive           |
| Update               | Update a project                             |

`Create` and `Delete` were removed when the oneAI endpoints behind them stopped existing. **Instantiate Template** and **Archive** are the honest equivalents, and deliberately not renames of what was removed:

- **Instantiate Template** creates a project from a project template. It takes a template ID, not a name and a description, and its optional **Name** defaults to the template's own name — the node omits the field rather than sending an empty string. Templates are made in oneAI; the node does not list or create them, and there is no endpoint that creates an empty project.
- **Archive** is how a project is retired. It deletes nothing, and it is reversible — that is what **Unarchive** is for. It is also **per user**: the API describes a project's `archived` flag as whether the *calling user* has archived it from their own view, so archiving through this node retires the project from the view of the identity the API key belongs to, not for the whole organization.

🔴 **Archive and Unarchive report a refusal with HTTP 200.** The endpoint behind them authorizes each project on its own and answers `200` with the refused project named in the response body, so the status code says nothing about whether anything happened. The node therefore never reads success from the status. It emits `{ projectId, action, success, error }`, and sets `success: false` with oneAI's own message in `error` whenever the project is absent from the response's `succeeded` list — including the case where oneAI names it in neither list. **Check `success`.** The node not throwing is not evidence that the project was archived; branch on the field with an If node if anything downstream depends on it.

Both take one project per input item and send it as a one-element request, so archiving many projects is n8n's item loop rather than an Aggregate node in front.

### Reference (2 operations)

Browse hub spaces and files as references to attach to conversations and artifacts.

| Operation   | Description                                        |
| ----------- | -------------------------------------------------- |
| List Files  | List files accessible for attaching as references  |
| List Spaces | List spaces accessible for attaching as references |

### Space (21 operations)

Hub spaces and the files in them. A space is backed by a storage provider, and the provider decides what the space can hold.

| Operation           | Description                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add Team            | Add a team to a space                                                                                                                                                                                                          |
| Add User            | Add a user to a space                                                                                                                                                                                                          |
| Create              | Create a new space                                                                                                                                                                                                             |
| Delete              | Delete a space                                                                                                                                                                                                                 |
| Delete File         | Delete a file from a space                                                                                                                                                                                                     |
| Download File       | Download a file from a space                                                                                                                                                                                                   |
| Embed Files         | Queue files/folders for embedding                                                                                                                                                                                              |
| Get                 | Get a space by ID                                                                                                                                                                                                              |
| Get Extracted Text  | Get the extracted Markdown text of a file in a space, without downloading its bytes                                                                                                                                            |
| Get File Stats      | Get embedding progress counts for every file in a space. Embedding is asynchronous, so this is how a workflow learns that Upload File and Embed Files have finished: poll until pending reaches zero.                           |
| List                | List all spaces                                                                                                                                                                                                                |
| List Files          | List files in a space                                                                                                                                                                                                          |
| List Folder         | List the direct children of one folder in a space, files and subfolders                                                                                                                                                        |
| List Teams          | List teams assigned to a space                                                                                                                                                                                                 |
| List Users          | List users assigned to a space                                                                                                                                                                                                 |
| Remove Team         | Remove a team from a space                                                                                                                                                                                                     |
| Remove User         | Remove a user from a space                                                                                                                                                                                                     |
| Rename File         | Rename a file in place, keeping its embeddings and its upload metadata                                                                                                                                                         |
| Sync                | Synchronize a linked space                                                                                                                                                                                                     |
| Transfer File       | Move or copy a file between spaces. To rename a file inside its own space use Rename File, which keeps the embeddings a transfer does not promise to preserve.                                                                  |
| Upload File         | Upload a file to a space                                                                                                                                                                                                       |

**Uploading a file is not the same as being able to ask about it.** oneAI extracts and embeds a file asynchronously, and until that finishes the file is invisible to retrieval and `Get Extracted Text` answers **404**. `Get File Stats` is the completion signal — it returns `totalFiles`, `embedded`, `pending`, `error`, `notEmbedded`, `unsupported`, `tooLarge` and `patternExcluded` for the whole space — so the shape that works is **Upload File → Wait → Get File Stats → IF `pending` is 0**, looping back to the Wait, with `error` and `tooLarge` as the failure branch.

🔴 **Rename File and Transfer File are not interchangeable, and the difference is measured, not assumed.** A `Transfer File` into the *same* space with mode `move` — the obvious way to rename a file before this operation existed — set the file's `embeddingStatus` back to `notEmbedded` and made its extracted text 404 again. `Rename File` left both intact. Use `Rename File` inside a space; use `Transfer File` to move or copy between spaces.

**List Folder** lists one folder's direct children — files and subfolders — rather than every path in the space, which is what makes a tree walk with a Loop Over Items node possible. Folder rows carry `hasSubfolders` and `fileCount`, so a walk knows where to descend without fetching the level first, and every row carries the space's `orgPagesExhausted` flag: when it is true the organization is out of its monthly page allowance and files awaiting vision extraction are queued rather than processed.

**Providers** — the twenty values `Create` offers and `List` filters on: oneAI Storage, oneData (Data Tables), Project, ClickUp, Dynamics Sales, Fireflies, Forgejo, GitHub, Google Drive, HTTP API, HubSpot, Lexoffice, MCP, N8N, OneDrive or SharePoint, OneGlue, Outlook, Plytix, SMB Share, Weclapp.

Providers that authenticate through OAuth additionally need an authorization code and a signed state, both issued by oneAI outside n8n. Providers this node does not model as individual fields can be configured through the **Provider Options (JSON)** field.

🔴 **Two things about `Space > Create` are worth knowing before you automate it.** Its **Authorization Code**, **State** and **Provider Options (JSON)** fields are *node parameters*, not credentials: n8n masks the first two in the editor but stores all three in the workflow definition in clear text, and snapshots them into every execution record. A single-use OAuth code is a fair thing to put there; a long-lived provider key is not. And the operation's response carries `webhookUrl`, which embeds a routing token that oneAI's own wizard shows only once — it is a secret that will otherwise sit in the execution log for as long as the log is kept. Route it into a store rather than leaving it in the output.

## Working with datasets

This is the feature the node exists for: hundreds of n8n nodes can pull rows out of another application, and this is what lands them in oneAI.

### Append or Append Many

Two operations write rows, and they are separate operations rather than one operation with a batching toggle, because the difference is visible in the output.

| | **Append** | **Append Many** |
| --- | --- | --- |
| requests | one per input item | **one for the whole input**, as a CSV import |
| output | one item per input item | **a single item** for the whole batch |
| row IDs | ✅ each output carries its new `rowId` | ❌ none — the import response has no IDs |
| types | preserved: a `BIGINT` column reads back as the number `36` | **not preserved: the same column reads back as the string `"41"`** |
| failure | per item, so the node's **On Error → Continue** setting is meaningful | one atomic transaction — one bad row rejects the whole batch |
| volume | 1 000 items cost 1 000 HTTP calls | 1 000 items cost 1 call |

**Use `Append`** when the workflow will touch these rows again — an `Update` or a `Delete` needs the `rowId`, and only `Append` gives you one — or when the column types have to survive.

**Use `Append Many`** for volume, when the rows are write-and-forget.

🔴 **The type difference is real and is not papered over.** A CSV cell carries no type, and the import does not coerce it to the column's declared type. In a table with a `BIGINT age` column, rows written by `Append` read back as numbers and rows written by `Append Many` read back as strings — from the same column of the same table. A downstream `{{ $json.age + 1 }}` therefore *adds* on one path and *concatenates* on the other. The node does not guess a coercion, because coercing sometimes is worse than never coercing; pick the operation deliberately, or normalise with a Code or Set node.

Because `Append Many` makes one request for the whole input, expressions in its **Space ID** and **Table Name** are evaluated against the **first item only**.

### Where the schema comes from

`Dataset > Create` takes an explicit typed schema and is the way to get typed columns. Both bulk paths — `Dataset > Import CSV` and `Dataset Row > Append Many` — offer **Create Table if Missing**, which lets the import create the dataset. A CSV is untyped, so a dataset created that way gets **all-`VARCHAR` columns**.

With that switch off the node lists the space's datasets first and fails with a named error if the name does not exist. That check is not decoration: the API answers `200` to an import into a mistyped table name, and the rows land in a new empty shadow table with nothing reported anywhere.

Unknown columns are rejected by oneAI rather than added silently. `Dataset > Update Schema` is where columns get added, dropped or renamed.

### Supplying values

`Append`, `Append Many` and `Update` share a **Data Mode**:

- **Auto-Map Input Data to Columns** — the incoming item *is* the row; its field names are matched to column names. Use **Fields to Ignore** to drop the ones that are not columns.
- **Map Each Column Below** — set each column by hand. Every value is handed over as a string.
- **Raw JSON** — the only mode that preserves numbers, booleans and native `JSON` column values exactly.

`Dataset Row > List` returns each row flattened with its `rowId` at the top level, which is what `Update` and `Delete` expect. Turning **Simplify** off returns the raw `{ id, data }` shape instead — worth doing if the table has a column literally named `rowId`.

## Binary data

Operations that **write** a file into a binary property: `AI > Generate Image`, `AI > Edit Image`, `AI > Generate Speech`, `Artifact > Export PDF`, `Artifact > Export PPTX`, `Audit Log > Export`, `Chat > Get Blob`, `Dataset > Export CSV`, `Space > Download File`.

Operations that **read** one: `AI > Edit Image`, `AI > Transcribe Audio`, `Dataset > Import CSV`, `Space > Upload File`.

`Chat > Save Blob to Space` moves bytes **without** a binary property at either end: oneAI copies the blob into the space itself, so a large file never travels through n8n.

`AI > Generate Speech` returns raw PCM — 24 kHz, 16-bit signed little-endian, mono, with no WAV or MP3 header. Downstream nodes that expect a playable file have to wrap or convert it.

## Features

- **Multi-model AI access** — query multiple AI models through a single node, with the model list loaded live from your instance
- **oneData datasets** — create typed tables and land rows from any other n8n node in them, one at a time with row IDs or in bulk
- **Automatic pagination** — list operations transparently handle paginated API responses
- **Storage integration** — spaces backed by OneDrive/SharePoint, Google Drive, GitHub, SMB, and a range of business applications
- **File management** — upload, download, rename, transfer and embed files across spaces, with an embedding-progress signal so a workflow knows when a file is ready to be asked about
- **Compliance** — read the EU AI Act audit trail, export it as a ZIP for a spreadsheet or a warehouse, and record a `block` / `unblock` verdict on a request the compliance layer held
- **Chat artefacts** — the images and files a chat produced can leave oneAI as binary data, as a signed link, or straight into a space
- **Item linking** — every output row names the input item it actually came from, so `$('Node Name').item` and the editor's item-linking view resolve correctly
- **Percent-encoded request paths** — every ID the node interpolates into a request path is percent-encoded, in every operation, so a value arriving from an upstream node cannot steer the request to a different endpoint than the one the operation names
- **Usable as an AI tool** — the node is exposed to n8n's AI Agent nodes; read [what that means](#what-an-ai-agent-can-do-with-this-node) before you wire it to one

## What you can build

Three workflows that were not possible before, written as the node's own reason to exist: it is a junction in a graph, not a mirror of an API.

**The file-ingestion loop finally has an ending.** *Google Drive (Download File) → oneAI (`Space > Upload File`) → Wait → oneAI (`Space > Get File Stats`) → IF `pending` is 0 → oneAI (`AI > Create Response`) → Slack.* A workflow could always upload a contract into a space and ask oneAI to embed it, and then it was blind: embedding is asynchronous and nothing said when it had finished, so the workflow either raced the embedder and answered from an index that did not contain the document yet, or hard-coded a sleep long enough to be safe and slow. `Get File Stats` is the completion signal, so the question is asked exactly once, as soon as it can be answered correctly — and `error` and `tooLarge` give the loop a failure branch it never had.

**oneAI's own document extraction, available to the rest of n8n.** *Gmail Trigger (with attachment) → oneAI (`Space > Upload File`) → oneAI (`Space > Get Extracted Text`) → Notion, Google Docs or any AI node.* oneAI already runs extraction and OCR over every file it ingests, and that work used to be locked inside oneAI: an author who wanted the text of a scanned PDF ran a second extraction with a second tool, paid for the same page twice, and got a different answer from the one oneAI's own search works against. `Get Extracted Text` returns the verbatim Markdown oneAI derived, so a scanned invoice that arrives by email becomes structured text with no second OCR vendor anywhere in the workflow.

**The compliance review loop closes outside oneAI's UI.** *Schedule Trigger → oneAI (`Audit Log > List`, filtered by `Since`) → Filter on `summary.reviewRequired` → Slack (send and wait for approval) → oneAI (`Audit Log > Review`).* When oneAI's compliance layer blocked a request and flagged it for review, the verdict could only be given by an admin signing in to oneAI. The blocked request now raises a message in the compliance channel, the reviewer answers in Slack, and the answer goes back as `unblock` or `block` with the reviewer's note. `Audit Log > List` emits one item per log with its `id` and `summary.reviewRequired`, so the Filter needs no Split Out, and `Since` is what stops the channel repeating itself on every tick.

## What an AI agent can do with this node

The node sets `usableAsTool: true`, so an n8n AI Agent can call it directly. n8n exposes a node to agents as a whole or not at all — `usableAsTool` takes no operation filter — so **every operation listed above is reachable by a model in one step**, including the ones that change state and the ones that move sensitive content. Grant it the way you would grant an API key, not the way you would grant a search box.

An operation's **action** string is literally the description the model reads, which is why they are worded as they are. The operations worth knowing about before you wire this node to an agent:

- **`Audit Log > Review`** records an organization admin's `block` or `unblock` decision on a compliance record that oneAI flagged. It is an approval, and a model can cast it. If a human is meant to decide, keep this node out of the agent's toolset and drive `Review` from a separate, non-agent branch of the workflow — the human gate belongs in the workflow, because the node cannot put one there for you.
- **`Chat > Export` with Include Redacted Values switched on** returns the original values that compliance redaction removed. The switch is off by default and the node sends the flag only when it is on, but an agent that sets parameters can set this one.
- **`Audit Log > Export`** produces a ZIP of audit records. All ten columns are included by default, among them **User ID** (personal data), **Matched Text** (the content that triggered the pattern) and **Reasoning** (which can quote the content it judged). Deselect what an audience does not need.
- **`Chat > Get Blob URL`** returns a signed link that needs **no oneAI credential** and lives for an hour. Anyone holding it — anyone who can open the execution, or read n8n's database — can fetch the blob until it expires, without an account and without membership of the space. Prefer `Chat > Get Blob`, which returns the bytes as binary data, when the link does not need to leave n8n.
- **Destructive operations** — `Chat > Delete`, `Space > Delete File`, `Space > Remove User`, `Space > Remove Team`, and `Chat > Save Blob to Space` with **Replace** on — do what they say, with no confirmation step.

The credential is the real boundary here, not the node: an agent can do what the API key can do. If that is too much, give the agent a credential for a oneAI user who is not an organization admin — `Audit Log > Review` is admin-only server-side.

### What n8n stores

Everything a node outputs is written to the execution record and is readable by anyone who can open that execution or read n8n's database. For this node that can include chat transcripts, the full extracted text of space documents, audit-log archives and the signed blob URL above. That content then lives under **n8n's** execution-pruning settings rather than under oneAI's retention policy — worth checking `EXECUTIONS_DATA_MAX_AGE` and `EXECUTIONS_DATA_PRUNE` on your instance before running these operations at volume.

## What this node does not do

Honesty is more useful here than a coverage percentage. oneAI's API is far larger than this node, and that is deliberate: the measure is what a workflow author can build, not how much of the API is mirrored.

- **No sign-in, sign-up or OAuth flows.** The node authenticates with an API key, and that is the whole authentication story. Spaces backed by an OAuth provider still need their authorization code and signed state issued by oneAI outside n8n.
- **No administration.** Teams, members, organization settings, API keys, webhooks, agent builder and integrations are not exposed. They are administrative surfaces rather than workflow junctions.
- **No way to remove a message rating** once `Chat > Rate Message` has set one. oneAI supports it (a `DELETE` on the same path) and the node deliberately does not, so that nobody assumes a rating placed by a workflow is permanent.
- **No trigger.** The node is an action node; it cannot start a workflow when something changes in oneAI. Poll with a Schedule Trigger in front of a list operation.
- **No streaming.** `AI > Create Response` returns the completed answer, not a token stream.
- **No tool/function-calling definitions** on `AI > Create Response`.
- **No empty-project creation, and no project deletion.** oneAI has no endpoint for either any more, so the node offers what oneAI actually does instead: `Project > Instantiate Template` creates a project from a template, and `Project > Archive` retires one reversibly, per user. Neither is a drop-in replacement for the `Create` and `Delete` operations they succeed, and the differences are set out under [Project](#project-6-operations).

## Compatibility

The node declares `typeVersion: 1`, which is what every workflow that uses it stores. Upgrading the package replaces the code behind that version rather than adding a new one, so an upgrade reaches every existing workflow.

Operations added in a release are additive and safe. Where a release has had to remove or change an operation — because the oneAI endpoint behind it no longer exists — it is named in that release's notes.

**Failed requests and your credential.** When an HTTP request fails, the node strips the credential out of the underlying error before turning it into an n8n error, so a failed execution of this node does not carry your API key in its saved record. That scrub is ours and does not depend on the host: n8n 1.102.0 and later (which ship `n8n-workflow` 1.99.0 and later) already suppress it, and n8n 1.101.0 and earlier do not — measured by walking the thrown error's own properties on both. The scrub was verified on n8n 2.37.9, where it is belt and braces; no instance older than 1.102.0 was available to observe it doing the work. Note that this is a property of *this* node, not of your instance: on an n8n older than 1.102.0, treat a failed execution of any other credentialed node as containing that node's credential.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Boot a local n8n with this node loaded
npm run dev

# Lint (n8n's own rule set)
npm run lint
npm run lint:fix

# Type check
npx tsc --noEmit

# Check the shipped surface against oneAI's OpenAPI spec — method, path and request shape
node scripts/drift-check.mjs

# Check that every `pairedItem` names the input item it claims to
node scripts/paired-item-check.mjs

# Check the node is still discoverable in n8n's nodes panel
node scripts/panel-check.mjs
```

The three `scripts/*.mjs` checks exit `0` when clean, `1` on a finding and `2` when their own
extractor stops matching the source — a `2` means every number they printed is meaningless, not that
the node is fine.

## License

[MIT](LICENSE.md)
