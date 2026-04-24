#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL, fileURLToPath } from "node:url";
import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { openDatabase } from "./db.js";
import { importProject, importProjectSection } from "./importer.js";
import {
  CONTEXT_TYPES,
  type ContextType,
  addContext,
  countContexts,
  deleteContext,
  deleteProjectFile,
  getContext,
  getProjectFile,
  listContexts,
  listProjectFiles,
  searchContexts,
  updateContext,
} from "./storage.js";
import { activityLog } from "./activity.js";
import { buildExport } from "./export.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer } from "./mcp-server.js";
import { RESOURCE_CATALOG, TOOL_CATALOG } from "./tool-catalog.js";

const db = openDatabase();
const PORT = Number(process.env.DY_MCP_API_PORT ?? 7879);
const ALLOWED_ORIGIN = process.env.DY_MCP_API_ORIGIN ?? "*";
const WEB_DIST = process.env.DY_MCP_WEB_DIST
  ? resolve(process.env.DY_MCP_WEB_DIST)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..", "web", "dist");
const RESET_INTERVAL_MIN = Number(process.env.DY_MCP_DEMO_RESET_MIN ?? 60);

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  body: unknown,
) => Promise<void> | void;

interface Route {
  method: string;
  pattern: RegExp;
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    body: unknown,
    match: RegExpMatchArray,
  ) => Promise<void> | void;
}

const routes: Route[] = [];

function agentFrom(req: IncomingMessage): string {
  const header = req.headers["x-agent"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const ua = req.headers["user-agent"];
  if (typeof ua === "string" && ua.includes("dy-mcp-web")) return "web";
  return "api";
}

function log(req: IncomingMessage, action: "read" | "write", key: string): void {
  activityLog.record({ agent: agentFrom(req), action, key });
}

function route(method: string, pattern: RegExp, handler: Route["handler"]): void {
  routes.push({ method, pattern, handler });
}

function json(res: ServerResponse, status: number, value: unknown): void {
  const payload = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "access-control-allow-origin": ALLOWED_ORIGIN,
    "access-control-allow-headers":
      "content-type, authorization, x-agent, accept, mcp-session-id, mcp-protocol-version",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  });
  res.end(payload);
}

function badRequest(res: ServerResponse, message: string): void {
  json(res, 400, { error: message });
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return null;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Expected JSON object body");
  }
  return body as Record<string, unknown>;
}

function asString(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`Field '${field}' must be a string`);
  return v;
}

function asOptionalString(v: unknown, field: string): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new Error(`Field '${field}' must be a string`);
  return v;
}

function asOptionalStringArray(v: unknown, field: string): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    throw new Error(`Field '${field}' must be an array of strings`);
  }
  return v as string[];
}

function asOptionalRecord(
  v: unknown,
  field: string,
): Record<string, unknown> | undefined {
  if (v === undefined) return undefined;
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(`Field '${field}' must be an object`);
  }
  return v as Record<string, unknown>;
}

function asContextType(v: unknown, field: string): ContextType {
  if (typeof v !== "string" || !(CONTEXT_TYPES as readonly string[]).includes(v)) {
    throw new Error(`Field '${field}' must be one of: ${CONTEXT_TYPES.join(", ")}`);
  }
  return v as ContextType;
}

function asOptionalNumber(v: unknown, field: string): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`Field '${field}' must be a number`);
  }
  return v;
}

function asOptionalBoolean(v: unknown, field: string): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "boolean") throw new Error(`Field '${field}' must be a boolean`);
  return v;
}

route("GET", /^\/health$/, (_req, res) => {
  json(res, 200, {
    ok: true,
    demo: true,
    resets_every_minutes: RESET_INTERVAL_MIN,
    counts: countContexts(db),
  });
});

route("GET", /^\/contexts$/, (req, res, url) => {
  const type = url.searchParams.get("type");
  const tag = url.searchParams.get("tag") ?? undefined;
  const parent = url.searchParams.get("parent_id");
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");
  const items = listContexts(db, {
    type: type ? asContextType(type, "type") : undefined,
    tag,
    parent_id: parent == null ? undefined : parent === "null" ? null : Number(parent),
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  log(req, "read", `contexts${type ? `?type=${type}` : ""}`);
  json(res, 200, { items });
});

route("POST", /^\/contexts$/, (req, res, _url, body) => {
  const obj = asRecord(body);
  const ctx = addContext(db, {
    type: asContextType(obj.type, "type"),
    title: asString(obj.title, "title"),
    content: asOptionalString(obj.content, "content"),
    tags: asOptionalStringArray(obj.tags, "tags"),
    metadata: asOptionalRecord(obj.metadata, "metadata"),
    parent_id:
      obj.parent_id === undefined
        ? undefined
        : obj.parent_id === null
          ? null
          : Number(obj.parent_id),
  });
  log(req, "write", `${ctx.type}/#${ctx.id}`);
  json(res, 201, ctx);
});

route("GET", /^\/contexts\/(\d+)$/, (req, res, _url, _body, match) => {
  const ctx = getContext(db, Number(match[1]));
  if (!ctx) return json(res, 404, { error: "Not found" });
  log(req, "read", `${ctx.type}/#${ctx.id}`);
  json(res, 200, ctx);
});

route("PATCH", /^\/contexts\/(\d+)$/, (req, res, _url, body, match) => {
  const obj = asRecord(body);
  const ctx = updateContext(db, {
    id: Number(match[1]),
    title: asOptionalString(obj.title, "title"),
    content: asOptionalString(obj.content, "content"),
    tags: asOptionalStringArray(obj.tags, "tags"),
    metadata: asOptionalRecord(obj.metadata, "metadata"),
    parent_id:
      obj.parent_id === undefined
        ? undefined
        : obj.parent_id === null
          ? null
          : Number(obj.parent_id),
  });
  if (!ctx) return json(res, 404, { error: "Not found" });
  log(req, "write", `${ctx.type}/#${ctx.id}`);
  json(res, 200, ctx);
});

route("DELETE", /^\/contexts\/(\d+)$/, (req, res, _url, _body, match) => {
  const id = Number(match[1]);
  const ok = deleteContext(db, id);
  if (!ok) return json(res, 404, { error: "Not found" });
  log(req, "write", `contexts/#${id} (deleted)`);
  json(res, 200, { ok: true });
});

route("GET", /^\/search$/, (req, res, url) => {
  const q = url.searchParams.get("q");
  if (!q) return badRequest(res, "Missing ?q=");
  const type = url.searchParams.get("type");
  const limit = url.searchParams.get("limit");
  const items = searchContexts(db, {
    query: q,
    type: type ? asContextType(type, "type") : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  log(req, "read", `search?q=${q}`);
  json(res, 200, { items });
});

route("GET", /^\/activity$/, (_req, res, url) => {
  const limit = Number(url.searchParams.get("limit") ?? "50");
  json(res, 200, { items: activityLog.list(Number.isFinite(limit) ? limit : 50) });
});

route("GET", /^\/export$/, (req, res) => {
  const payload = buildExport(db);
  log(req, "read", "export");
  json(res, 200, payload);
});

route("GET", /^\/tools$/, (req, res) => {
  log(req, "read", "tools");
  json(res, 200, { tools: TOOL_CATALOG, resources: RESOURCE_CATALOG });
});

async function handleMcp(
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
): Promise<void> {
  const mcp = buildMcpServer(db);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    void transport.close().catch(() => {});
    void mcp.close().catch(() => {});
  });
  try {
    await mcp.connect(transport);
    await transport.handleRequest(req, res, body);
    log(req, "read", "mcp");
  } catch (err) {
    if (!res.headersSent) {
      json(res, 500, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

route("POST", /^\/mcp$/, async (req, res, _url, body) => {
  await handleMcp(req, res, body);
});
route("GET", /^\/mcp$/, (_req, res) => {
  res.writeHead(405, { allow: "POST" });
  res.end();
});
route("DELETE", /^\/mcp$/, (_req, res) => {
  res.writeHead(405, { allow: "POST" });
  res.end();
});

route("GET", /^\/contexts\/(\d+)\/files$/, (_req, res, url, _body, match) => {
  const section = url.searchParams.get("section") ?? undefined;
  const files = listProjectFiles(db, Number(match[1]), section);
  json(res, 200, { items: files });
});

route("GET", /^\/files\/(\d+)$/, (_req, res, _url, _body, match) => {
  const file = getProjectFile(db, Number(match[1]));
  if (!file) return json(res, 404, { error: "Not found" });
  json(res, 200, file);
});

route("DELETE", /^\/files\/(\d+)$/, (_req, res, _url, _body, match) => {
  const ok = deleteProjectFile(db, Number(match[1]));
  if (!ok) return json(res, 404, { error: "Not found" });
  json(res, 200, { ok: true });
});

route("POST", /^\/import\/project$/, async (_req, res, _url, body) => {
  const obj = asRecord(body);
  const result = await importProject(db, {
    path: asString(obj.path, "path"),
    name: asOptionalString(obj.name, "name"),
    description: asOptionalString(obj.description, "description"),
    tags: asOptionalStringArray(obj.tags, "tags"),
    includeContent: asOptionalBoolean(obj.include_content, "include_content"),
    maxFileBytes: asOptionalNumber(obj.max_file_bytes, "max_file_bytes"),
    maxTotalFiles: asOptionalNumber(obj.max_total_files, "max_total_files"),
  });
  json(res, 201, {
    project_id: result.context.id,
    title: result.context.title,
    file_count: result.fileCount,
    bytes_stored: result.bytesStored,
  });
});

route("POST", /^\/import\/section$/, async (_req, res, _url, body) => {
  const obj = asRecord(body);
  const result = await importProjectSection(db, {
    path: asString(obj.path, "path"),
    section_name: asString(obj.section_name, "section_name"),
    parent_project_id:
      obj.parent_project_id === undefined ? undefined : Number(obj.parent_project_id),
    title: asOptionalString(obj.title, "title"),
    description: asOptionalString(obj.description, "description"),
    tags: asOptionalStringArray(obj.tags, "tags"),
    includeContent: asOptionalBoolean(obj.include_content, "include_content"),
    maxFileBytes: asOptionalNumber(obj.max_file_bytes, "max_file_bytes"),
    maxTotalFiles: asOptionalNumber(obj.max_total_files, "max_total_files"),
  });
  json(res, 201, {
    project_id: result.context.id,
    attached_to_project_id: result.attachedToProjectId,
    file_count: result.fileCount,
    bytes_stored: result.bytesStored,
  });
});

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function serveStatic(req: IncomingMessage, res: ServerResponse, url: URL): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (!existsSync(WEB_DIST)) return false;

  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalized = normalize(requestPath).replace(/^([/\\])+/, "");
  const filePath = join(WEB_DIST, normalized);
  if (!filePath.startsWith(WEB_DIST)) return false;

  let target = filePath;
  if (!existsSync(target) || statSync(target).isDirectory()) {
    target = join(WEB_DIST, "index.html");
    if (!existsSync(target)) return false;
  }

  const ext = extname(target).toLowerCase();
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";
  res.writeHead(200, {
    "content-type": mime,
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    "access-control-allow-origin": ALLOWED_ORIGIN,
  });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  createReadStream(target).pipe(res);
  return true;
}

const dispatcher: Handler = async (req, res, url, body) => {
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const match = url.pathname.match(r.pattern);
    if (match) {
      await r.handler(req, res, url, body, match);
      return;
    }
  }
  if (serveStatic(req, res, url)) return;
  json(res, 404, { error: `No route for ${req.method} ${url.pathname}` });
};

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": ALLOWED_ORIGIN,
        "access-control-allow-headers":
          "content-type, authorization, x-agent, accept, mcp-session-id, mcp-protocol-version",
        "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      });
      res.end();
      return;
    }

    let body: unknown = null;
    if (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") {
      body = await readBody(req);
    }

    await dispatcher(req, res, url, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    json(res, 500, { error: message });
  }
});

httpServer.listen(PORT, () => {
  const staticNote = existsSync(WEB_DIST)
    ? `serving web from ${WEB_DIST}`
    : "no web/dist found (run `npm run web:build`)";
  console.log(
    `dy-mcp-demo listening on http://localhost:${PORT} (no auth, public demo) - ${staticNote}`,
  );
});
