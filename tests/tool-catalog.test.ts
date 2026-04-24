import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/db.js";
import { buildMcpServer } from "../src/mcp-server.js";
import { TOOL_CATALOG, RESOURCE_CATALOG } from "../src/tool-catalog.js";

type ToolsListResult = {
  result?: { tools?: Array<{ name: string }> };
};

async function listServerTools(): Promise<string[]> {
  const db = openDatabase(":memory:");
  try {
    const mcp = buildMcpServer(db);
    // The McpServer wraps a Server that exposes tool handlers via the request
    // callbacks registered internally. The easiest public path is to call the
    // request handler for tools/list directly using the _requestHandlers map
    // on the wrapped server. No stable public API — fall back to the internal.
    const inner = (
      mcp as unknown as { server: { _requestHandlers: Map<string, unknown> } }
    ).server;
    const handler = inner._requestHandlers.get("tools/list") as
      | ((
          req: unknown,
          extra: unknown,
        ) => Promise<ToolsListResult | ToolsListResult["result"]>)
      | undefined;
    if (!handler) throw new Error("tools/list handler not registered");
    const raw = await handler(
      { method: "tools/list", params: {} },
      {
        signal: new AbortController().signal,
        requestId: 1,
        sendNotification: async () => {},
        sendRequest: async () => ({}),
      },
    );
    const result = (raw as ToolsListResult).result ?? (raw as ToolsListResult["result"]);
    const tools = result?.tools ?? [];
    return tools.map((t) => t.name);
  } finally {
    db.close();
  }
}

describe("tool catalog", () => {
  it("mirrors every tool the MCP server exposes", async () => {
    const serverToolNames = (await listServerTools()).sort();
    const catalogNames = TOOL_CATALOG.map((t) => t.name).sort();
    expect(catalogNames).toEqual(serverToolNames);
  });

  it("has a description and a stable parameter shape for every entry", () => {
    for (const tool of TOOL_CATALOG) {
      expect(tool.name).toMatch(/^[a-z_]+$/);
      expect(tool.title.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(20);
      for (const p of tool.parameters) {
        expect(p.name.length).toBeGreaterThan(0);
        expect(p.type.length).toBeGreaterThan(0);
        expect(typeof p.required).toBe("boolean");
      }
    }
  });

  it("lists one resource per context type plus the overview", () => {
    const names = RESOURCE_CATALOG.map((r) => r.name);
    expect(names).toContain("personal-context-overview");
    for (const type of [
      "project",
      "idea",
      "preference",
      "writing_style",
      "skill",
      "general",
    ]) {
      expect(names).toContain(`personal-context-${type}`);
    }
  });
});
