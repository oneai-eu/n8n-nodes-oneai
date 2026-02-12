# n8n-nodes-oneai

A community node for [n8n](https://n8n.io/) that integrates with the [OneAI](https://oneai.eu) platform — an AI hub providing access to multiple AI models and collaboration features.

## Installation

### In n8n (Community Node)

1. Go to **Settings > Community Nodes**
2. Select **Install a community node**
3. Enter `n8n-nodes-oneai`
4. Agree to the risks and click **Install**

### Manual / Development

```bash
# Clone the repository
git clone <repo-url>
cd n8n-nodes-oneai

# Install dependencies
pnpm install

# Build
pnpm build
```

## Authentication

This node uses **Bearer Token** authentication via an API key.

To configure credentials in n8n:

| Field       | Description                                          |
| ----------- | ---------------------------------------------------- |
| **OneAI URL** | Base URL of your OneAI instance (e.g. `https://hub.oneai.eu`) |
| **API Key**   | Your API key, generated from your OneAI hub settings          |

## Supported Resources & Operations

### Space (16 operations)

Manage workspaces with support for multiple storage providers (Local, OneDrive, SharePoint, Google Drive, GitHub).

| Operation       | Description                              |
| --------------- | ---------------------------------------- |
| Add Team        | Add a team to a space                    |
| Add User        | Add a user to a space                    |
| Create          | Create a new space                       |
| Delete          | Delete a space                           |
| Delete File     | Delete a file from a space               |
| Download File   | Download a file from a space             |
| Embed Files     | Queue files/folders for embedding        |
| Get             | Get a space by ID                        |
| List            | List all spaces                          |
| List Files      | List files in a space                    |
| List Teams      | List teams assigned to a space           |
| List Users      | List users assigned to a space           |
| Remove Team     | Remove a team from a space               |
| Remove User     | Remove a user from a space               |
| Sync            | Synchronize a linked space               |
| Transfer File   | Move or copy a file between spaces       |

### Chat (6 operations)

Create and manage AI chat conversations.

| Operation   | Description                          |
| ----------- | ------------------------------------ |
| Create      | Create a new chat                    |
| Delete      | Delete a chat                        |
| Get         | Get chat history                     |
| Get Models  | List available AI models             |
| List        | List chats with optional filtering   |
| Update      | Update chat details (rename or move) |

### OpenAI (1 operation)

Send messages to AI models using the OpenAI-compatible API.

| Operation        | Description                                        |
| ---------------- | -------------------------------------------------- |
| Create Response  | Send a message to an AI model and get a response   |

**Supported models:** GPT-5 (Nano, Mini, 5.1, 5.2), Claude (Sonnet, Haiku, Opus), Mistral, Gemini

**Input modes:**
- **Messages** — user-friendly role/content fields
- **JSON** — full control for complex conversations, images, etc.

**Advanced options:** Temperature, Reasoning Effort, Reasoning Summary, Tools (function calling)

### Artifact (6 operations)

Manage documents and files within spaces.

| Operation      | Description                              |
| -------------- | ---------------------------------------- |
| Create         | Create an artifact from a file           |
| Delete         | Delete an artifact from a space          |
| Export PDF     | Export an artifact as a PDF              |
| Get Markdown   | Get the markdown content of an artifact  |
| List All       | List all artifacts with optional filtering |
| List by Space  | List artifacts in a specific space       |

### Project (5 operations)

Organize work into projects.

| Operation | Description            |
| --------- | ---------------------- |
| Create    | Create a new project   |
| Delete    | Delete a project       |
| Get       | Get a project by ID    |
| List      | List all projects      |
| Update    | Update a project       |

### Reference (2 operations)

Access references for attaching to conversations and artifacts.

| Operation    | Description                                         |
| ------------ | --------------------------------------------------- |
| List Files   | List files accessible for attaching as references   |
| List Spaces  | List spaces accessible for attaching as references  |

## Features

- **Multi-model AI access** — query OpenAI, Claude, Mistral, and Gemini models through a single node
- **Streaming support** — handles Server-Sent Events for real-time AI responses
- **Automatic pagination** — list operations transparently handle paginated API responses
- **Cloud storage integration** — connect spaces to OneDrive, SharePoint, Google Drive, or GitHub
- **Function calling** — pass tool definitions to AI models via JSON
- **File management** — upload, download, transfer, and embed files across spaces

## Development

```bash
# Build
pnpm build

# Watch mode (recompile on changes)
pnpm dev

# Lint & format
pnpm lint
pnpm format
```

## License

[MIT](LICENSE)
