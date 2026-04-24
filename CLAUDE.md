# dy-mcp-demo

Public, unauthenticated clone of **dy-mcp** hosted at
`https://demo-mcp.dyuhaus.com`. Resets hourly to the fictional "Alex Quinn"
persona in `scripts/seed.ts`.

This repo is a fork of <https://github.com/dyuhaus/dy-mcp> with auth stripped.
When syncing fixes from upstream, skip anything under:

- `src/auth.ts`, `src/oauth.ts`, `src/oauth-store.ts`
- `tests/auth.test.ts`, `tests/oauth.test.ts`, `tests/oauth-http.test.ts`
- `web/src/screens/SignIn.tsx`, `web/src/screens/ChangePassword.tsx`
- `web/src/lib/session.ts`
- The `/auth/*`, `/oauth/*`, `/.well-known/*` routes in `server.ts`

## Architecture

```
src/                MCP + HTTP server (Node, TS, SQLite)
├── db.ts           SQLite schema — contexts + project_files only (no oauth tables)
├── storage.ts      CRUD for contexts & project_files
├── importer.ts     Walks a directory respecting .gitignore, indexes text files
├── activity.ts     In-memory ring buffer for /activity (500 entries max)
├── export.ts       Builds the "payload" shape served from /export
├── mcp-server.ts   buildMcpServer(db) — registers every tool/resource
├── tool-catalog.ts Static tool + resource catalog (drives the /tools endpoint)
├── index.ts        MCP stdio entrypoint
└── server.ts       HTTP JSON API entrypoint — REST + /mcp, static web/dist.
                    NO auth middleware. NO /auth/* or /oauth/* routes.

scripts/
├── seed.ts                      Wipes + reseeds the demo DB with Alex Quinn persona
├── fixtures/sample-project/     Tiny markdown-to-HTML project used by the importer
└── install-demo-task.ps1        Windows Task Scheduler bootstrap

web/                Vite + React + TS frontend
├── src/
│   ├── App.tsx           direct boot into Dashboard (no sign-in gate)
│   ├── components/       Shell (sidebar says "PUBLIC DEMO"), Loading/Error/Empty
│   ├── screens/          one file per screen (Dashboard, Styles, Projects, …)
│   │                     NOTE: no SignIn, no ChangePassword
│   └── lib/              api client (no session token), hooks, design tokens, types
└── tests/          Vitest + jsdom + Testing Library

tests/              Vitest tests for the server package
```

## Commands

### Server (`/`)

- `npm run dev:api` — HTTP API via tsx (:7879)
- `npm run dev` — MCP stdio entrypoint via tsx
- `npm run build` — tsc → `dist/`
- `npm start` / `npm run start:api` — run built binaries
- `npm run seed` — wipe + reseed the demo DB
- `npm test` — vitest
- `npm run typecheck` — tsc --noEmit

### Web (`/web`)

- `npm run dev` — Vite dev server on :5173
- `npm run build` — typecheck + vite build into `web/dist/`

### Convenience (root)

- `npm run test:all` — server + web tests
- `npm run typecheck:all` — server + web typecheck

## Seed data

`scripts/seed.ts` creates ~11 contexts covering all six types, plus one
imported project (`scripts/fixtures/sample-project/`) so the project-files
browser has something to show:

| Type           | Count | Notes                                        |
|----------------|-------|----------------------------------------------|
| writing_style  | 1     | "Plain-spoken with a dry wit"                |
| project        | 3     | quill-md, Fieldnotes, Commonplace book       |
| idea           | 2     |                                              |
| preference     | 3     | env / voice / work categories                |
| skill          | 1     | Interviewing                                 |
| general        | 1     | Based in Lisbon                              |

The seed is deterministic and idempotent — running it again wipes the current
state and rebuilds the same set.

## Hosting

Two Windows scheduled tasks (created by `scripts/install-demo-task.ps1`):

1. **`dy-mcp-demo-api`** — runs `node dist/server.js` at boot.
   LogonType=S4U so `~` resolves to the user's profile (not SYSTEM).
   Port 7879.

2. **`dy-mcp-demo-reset`** — runs `scripts/seed.ts` via `tsx` on an hourly
   trigger. No server restart needed; the API reopens the DB on every
   request-adjacent code path.

Cloudflare tunnel ingress: add `demo-mcp.dyuhaus.com` → `http://localhost:7879`
to `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml` (the
service reads the SYSTEM profile, not the user profile), then restart the
`cloudflared` service as admin. Route DNS via
`cloudflared tunnel route dns <tunnel-id> demo-mcp.dyuhaus.com`.

## Things to know before editing

- **Import path extensions**: TS source imports use `.js` extensions because
  the package is `"type": "module"` and emits pure ESM.
- **Windows paths**: `importer.ts::walkProject` normalizes backslashes to
  forward slashes so the file tree renders correctly cross-platform.
- **No ORM**: `better-sqlite3` is synchronous and good enough. Keep SQL in
  `storage.ts`.
- **Don't add auth back** — that's the whole point of this repo. If you need
  auth, work on upstream dy-mcp instead.
- **Activity logging** runs on every API call; keep writes to `activityLog`
  inside existing routes rather than sprinkling them around handlers.
- **Data is fictional** — don't treat any persona details as fact or
  preference for the actual user.
