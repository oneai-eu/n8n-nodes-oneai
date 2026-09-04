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

**62 operations across 10 resources.** The tables below are derived from `nodes/OneAi/modes.ts`, the same file the node's **Resource** and **Operation** dropdowns are built from, and they follow the order the dropdown shows. Names and descriptions are the ones the dropdown shows, verbatim. Operations that exist as source files but are not dispatched are not listed here, because they ship to nobody.

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

### Chat (5 operations)

Create and manage AI chat conversations in the hub.

| Operation | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| Create    | Create a new chat                                                 |
| Delete    | Delete a chat                                                     |
| Get       | Get chat history                                                  |
| List      | List chats with optional filtering                                |
| Update    | Update chat details (rename, switch branch, or set persona/agent) |

🔴 **A chat lives in a space, and only in a space whose provider is `Project`.** Passing any other space ID — an oneAI Storage space, a oneData space — is rejected with `Chats can only be created in projects.` **List** filters by space ID for the same reason.

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

### Space (17 operations)

Hub spaces and the files in them. A space is backed by a storage provider, and the provider decides what the space can hold.

| Operation     | Description                        |
| ------------- | ---------------------------------- |
| Add Team      | Add a team to a space              |
| Add User      | Add a user to a space              |
| Create        | Create a new space                 |
| Delete        | Delete a space                     |
| Delete File   | Delete a file from a space         |
| Download File | Download a file from a space       |
| Embed Files   | Queue files/folders for embedding  |
| Get           | Get a space by ID                  |
| List          | List all spaces                    |
| List Files    | List files in a space              |
| List Teams    | List teams assigned to a space     |
| List Users    | List users assigned to a space     |
| Remove Team   | Remove a team from a space         |
| Remove User   | Remove a user from a space         |
| Sync          | Synchronize a linked space         |
| Transfer File | Move or copy a file between spaces |
| Upload File   | Upload a file to a space           |

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

Operations that **write** a file into a binary property: `AI > Generate Image`, `AI > Edit Image`, `AI > Generate Speech`, `Artifact > Export PDF`, `Artifact > Export PPTX`, `Dataset > Export CSV`, `Space > Download File`.

Operations that **read** one: `AI > Edit Image`, `AI > Transcribe Audio`, `Dataset > Import CSV`, `Space > Upload File`.

`AI > Generate Speech` returns raw PCM — 24 kHz, 16-bit signed little-endian, mono, with no WAV or MP3 header. Downstream nodes that expect a playable file have to wrap or convert it.

## Features

- **Multi-model AI access** — query multiple AI models through a single node, with the model list loaded live from your instance
- **oneData datasets** — create typed tables and land rows from any other n8n node in them, one at a time with row IDs or in bulk
- **Automatic pagination** — list operations transparently handle paginated API responses
- **Storage integration** — spaces backed by OneDrive/SharePoint, Google Drive, GitHub, SMB, and a range of business applications
- **File management** — upload, download, transfer and embed files across spaces
- **Item linking** — every output row names the input item it actually came from, so `$('Node Name').item` and the editor's item-linking view resolve correctly
- **Percent-encoded request paths** — every ID the node interpolates into a request path is percent-encoded, in every operation, so a value arriving from an upstream node cannot steer the request to a different endpoint than the one the operation names
- **Usable as an AI tool** — the node is exposed to n8n's AI Agent nodes

## What this node does not do

Honesty is more useful here than a coverage percentage. oneAI's API is far larger than this node, and that is deliberate: the measure is what a workflow author can build, not how much of the API is mirrored.

- **No sign-in, sign-up or OAuth flows.** The node authenticates with an API key, and that is the whole authentication story. Spaces backed by an OAuth provider still need their authorization code and signed state issued by oneAI outside n8n.
- **No administration.** Teams, members, organization settings, API keys, webhooks, agent builder and integrations are not exposed. They are administrative surfaces rather than workflow junctions.
- **No audit log access yet.** This one is a known gap rather than a decision.
- **No trigger.** The node is an action node; it cannot start a workflow when something changes in oneAI. Poll with a Schedule Trigger in front of a list operation.
- **No streaming.** `AI > Create Response` returns the completed answer, not a token stream.
- **No tool/function-calling definitions** on `AI > Create Response`.
- **No empty-project creation, and no project deletion.** oneAI has no endpoint for either any more, so the node offers what oneAI actually does instead: `Project > Instantiate Template` creates a project from a template, and `Project > Archive` retires one reversibly, per user. Neither is a drop-in replacement for the `Create` and `Delete` operations they succeed, and the differences are set out under [Project](#project-6-operations).

## Compatibility

The node declares `typeVersion: 1`, which is what every workflow that uses it stores. Upgrading the package replaces the code behind that version rather than adding a new one, so an upgrade reaches every existing workflow.

Operations added in a release are additive and safe. Where a release has had to remove or change an operation — because the oneAI endpoint behind it no longer exists — it is named in that release's notes.

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
