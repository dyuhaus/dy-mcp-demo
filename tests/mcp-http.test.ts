import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const REPO_ROOT = process.cwd();
const PORT = "17990";

async function waitForPort(url: string, tries = 40): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 401 || res.status === 405) return;
    } catch {
      /* not ready */
    }
    await delay(100);
  }
  throw new Error(`Server never became ready at ${url}`);
}

describe("MCP HTTP endpoint (demo: no auth)", () => {
  let tmp: string;
  let proc: ChildProcess;

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), "dy-mcp-demo-http-"));
    proc = spawn(process.execPath, [join(REPO_ROOT, "dist", "server.js")], {
      env: {
        ...process.env,
        DY_MCP_DB_PATH: join(tmp, "ctx.db"),
        DY_MCP_API_PORT: PORT,
        DY_MCP_WEB_DIST: join(tmp, "no-such-dir"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForPort(`http://localhost:${PORT}/health`);
  });

  afterEach(async () => {
    if (proc && !proc.killed) {
      proc.kill();
      await new Promise<void>((r) => proc.once("exit", () => r()));
    }
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns 405 for GET /mcp (stateless mode)", async () => {
    const res = await fetch(`http://localhost:${PORT}/mcp`, { method: "GET" });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("initializes without any auth header", async () => {
    const res = await fetch(`http://localhost:${PORT}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      }),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    expect(text).toContain("serverInfo");
    expect(text).toContain("dy-mcp-demo");
  });

  it("lists every registered tool via tools/list", async () => {
    const res = await fetch(`http://localhost:${PORT}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      }),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    for (const name of [
      "list_contexts",
      "get_context",
      "add_context",
      "update_context",
      "delete_context",
      "search_contexts",
      "get_personal_context",
      "import_project",
      "import_project_section",
      "list_project_files",
      "get_project_file",
      "delete_project_file",
    ]) {
      expect(text).toContain(`"name":"${name}"`);
    }
  });

  it("health endpoint reports demo:true", async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      ok: boolean;
      demo?: boolean;
      resets_every_minutes?: number;
    };
    expect(body.ok).toBe(true);
    expect(body.demo).toBe(true);
    expect(typeof body.resets_every_minutes).toBe("number");
  });
});
