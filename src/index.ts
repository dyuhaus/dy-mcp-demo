#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openDatabase } from "./db.js";
import { buildMcpServer } from "./mcp-server.js";

async function main(): Promise<void> {
  const db = openDatabase();
  const server = buildMcpServer(db);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("dy-mcp server failed:", err);
  process.exit(1);
});
