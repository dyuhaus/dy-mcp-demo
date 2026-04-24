# dy-mcp-demo

A public, unauthenticated demo of [**dy-mcp**](https://github.com/dyuhaus/dy-mcp) —
an MCP personal-context server. Lets you poke at every tool the server exposes
without needing to install or configure anything.

**Live at:** <https://demo-mcp.dyuhaus.com>

- Open the URL in a browser to see the Editorial-style web companion.
- Or point any MCP-aware client (Claude Desktop, Claude Code, etc.) at
  `https://demo-mcp.dyuhaus.com/mcp` — no auth header required.

The data is invented (a fictional writer-developer named "Alex Quinn") and the
whole database **resets every hour**, so feel free to create, edit, or delete
anything. You won't break it.

For the real, password-protected server this is cloned from, see
[dyuhaus/dy-mcp](https://github.com/dyuhaus/dy-mcp).

## What's the same as dy-mcp?

Everything to do with the MCP protocol and the data model:

- Six typed contexts: `project`, `idea`, `preference`, `writing_style`, `skill`, `general`.
- All 12 tools: `get_personal_context`, `list_contexts`, `get_context`,
  `add_context`, `update_context`, `delete_context`, `search_contexts`,
  `import_project`, `import_project_section`, `list_project_files`,
  `get_project_file`, `delete_project_file`.
- All 7 resources under `context://`.
- Same SQLite schema, same storage code, same importer, same HTTP routes.

## What's different?

- **No auth.** `/auth/*`, `/oauth/*`, `/.well-known/*`, session cookies,
  password bootstrap — all removed. `/mcp` is open. The web UI boots straight
  into the dashboard.
- **Hourly reset.** A scheduled task wipes the DB and reseeds it with the
  fictional persona (see `scripts/seed.ts`).
- **Default port is 7879** so it can run alongside the main dy-mcp on the
  same machine.
- **Web sidebar shows "PUBLIC DEMO"** and a "resets hourly" note.

## Try it from an MCP client

### Claude Code

```bash
claude mcp add --transport http dy-mcp-demo https://demo-mcp.dyuhaus.com/mcp
```

### Claude Desktop / any config-file client

```json
{
  "mcpServers": {
    "dy-mcp-demo": {
      "transport": "http",
      "url": "https://demo-mcp.dyuhaus.com/mcp"
    }
  }
}
```

### curl

```bash
# list all tools
curl -sS -X POST https://demo-mcp.dyuhaus.com/mcp \
  -H "content-type: application/json" \
  -H "accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# call a tool
curl -sS -X POST https://demo-mcp.dyuhaus.com/mcp \
  -H "content-type: application/json" \
  -H "accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_personal_context","arguments":{}}}'
```

## Run the demo locally

```bash
npm install
npm run build
npm run seed       # wipe + reseed the demo DB
npm run web:build
npm run start:api  # http://localhost:7879
```

The web UI is served at the same port as the API.

Dev loop:

```bash
npm run dev:api    # backend with tsx watch
npm run web:dev    # vite dev server on :5173
```

## HTTP endpoints

| Method | Path                            | Body / query                                                  |
|--------|---------------------------------|---------------------------------------------------------------|
| GET    | `/health`                       | returns `{ ok, demo: true, resets_every_minutes, counts }`    |
| GET    | `/contexts`                     | `?type=&tag=&parent_id=&limit=&offset=`                       |
| POST   | `/contexts`                     | `{ type, title, content?, tags?, metadata?, parent_id? }`     |
| GET    | `/contexts/:id`                 | —                                                             |
| PATCH  | `/contexts/:id`                 | any subset of the add body                                    |
| DELETE | `/contexts/:id`                 | —                                                             |
| GET    | `/search`                       | `?q=&type=&limit=`                                            |
| GET    | `/activity`                     | `?limit=` — in-memory ring buffer, 500 entries, newest first  |
| GET    | `/export`                       | full payload snapshot                                         |
| GET    | `/tools`                        | catalog of tools + resources (drives the /Tools page)         |
| GET    | `/contexts/:id/files`           | `?section=`                                                   |
| GET    | `/files/:id`                    | —                                                             |
| DELETE | `/files/:id`                    | —                                                             |
| POST   | `/import/project`               | `{ path, name?, description?, tags?, include_content?, … }`   |
| POST   | `/import/section`               | `{ path, section_name, parent_project_id?, … }`               |
| POST   | `/mcp`                          | MCP over Streamable HTTP (stateless, single round-trip)       |

## Hosting

The included `scripts/install-demo-task.ps1` registers two Windows scheduled
tasks:

1. `dy-mcp-demo-api` — runs the built server on :7879 at boot.
2. `dy-mcp-demo-reset` — runs `scripts/seed.ts` every hour via `tsx`.

Point a Cloudflare tunnel at `http://localhost:7879` under the hostname of
your choice. See `CLAUDE.md` for the exact commands.

## Environment variables

| Variable                 | Default                          |
|--------------------------|----------------------------------|
| `DY_MCP_DB_PATH`         | `~/.dy-mcp-demo/context.db`       |
| `DY_MCP_API_PORT`        | `7879`                           |
| `DY_MCP_API_ORIGIN`      | `*`                              |
| `DY_MCP_DEMO_RESET_MIN`  | `60` (informational)             |
| `DY_MCP_WEB_DIST`        | `<repo>/web/dist`                |
| `VITE_API_BASE_URL`      | (same origin)                    |

## License

MIT.
