# obsidian-mcp

MCP (Model Context Protocol) server for Obsidian Local REST API, built for a Karpathy-style LLM wiki workflow:

- plain markdown notes
- consistent note structure (summary + tags + related notes)
- fast retrieval/search + safe write tools for organization

This project mirrors the structure of [aha-mcp](../aha-mcp):

- `src/index.ts` server entrypoint
- `src/client.ts` HTTP client
- `src/models/` types
- `src/tools/read.ts` read-only tools
- `src/tools/write.ts` write tools

## Requirements

- Node.js 18+
- Obsidian with the Local REST API plugin enabled
- API key from the plugin settings

## Environment

Copy `.env.example` to `.env` and set values:

- `OBSIDIAN_API_KEY` (required)
- `OBSIDIAN_BASE_URL` (optional, default `http://127.0.0.1:27123`)

## Install and build

```bash
npm install
npm run build
```

## Run

```bash
OBSIDIAN_API_KEY=... OBSIDIAN_BASE_URL=http://127.0.0.1:27123 node dist/index.js
```

## MCP config example

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/absolute/path/to/obsidian-mcp/dist/index.js"],
      "env": {
        "OBSIDIAN_API_KEY": "your_obsidian_api_key",
        "OBSIDIAN_BASE_URL": "http://127.0.0.1:27123"
      }
    }
  }
}
```

## Tools

### Read tools

- `get_obsidian_status`: confirm API status/auth
- `get_note`: read markdown or note JSON metadata
- `search_notes`: simple text search with context snippets

### Write tools

- `create_structured_note`: create a Karpathy-style template note
- `upsert_note`: create/replace note content
- `append_note`: append content
- `patch_note`: heading/block/frontmatter patch operations
- `move_note`: copy+delete move operation
- `delete_note`: delete a note by vault-relative path

## Suggested workflow

1. Capture rough notes into `inbox/` via `create_structured_note`.
2. Use `search_notes` to triage and identify overlaps.
3. Move notes into durable folders with `move_note`.
4. Add manual wiki-links in note content where needed.
5. Remove obsolete notes with `delete_note`.
