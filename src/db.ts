import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const DB_PATH =
  process.env.DY_MCP_DB_PATH ?? join(homedir(), ".dy-mcp-demo", "context.db");

export type DB = Database.Database;

export function openDatabase(path: string = DB_PATH): DB {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

function initSchema(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      parent_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(parent_id) REFERENCES contexts(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_contexts_type ON contexts(type);
    CREATE INDEX IF NOT EXISTS idx_contexts_parent ON contexts(parent_id);
    CREATE INDEX IF NOT EXISTS idx_contexts_updated ON contexts(updated_at DESC);

    CREATE TABLE IF NOT EXISTS project_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      content TEXT,
      language TEXT,
      size INTEGER,
      is_section INTEGER NOT NULL DEFAULT 0,
      section_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES contexts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_files_section ON project_files(project_id, section_name);
  `);
}
