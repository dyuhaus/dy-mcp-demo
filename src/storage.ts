import type { DB } from "./db.js";

export const CONTEXT_TYPES = [
  "project",
  "idea",
  "preference",
  "writing_style",
  "skill",
  "general",
] as const;

export type ContextType = (typeof CONTEXT_TYPES)[number];

export interface Context {
  id: number;
  type: ContextType;
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, unknown>;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: number;
  project_id: number;
  path: string;
  content: string | null;
  language: string | null;
  size: number | null;
  is_section: boolean;
  section_name: string | null;
  created_at: string;
}

interface ContextRow {
  id: number;
  type: string;
  title: string;
  content: string;
  tags: string;
  metadata: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

interface ProjectFileRow {
  id: number;
  project_id: number;
  path: string;
  content: string | null;
  language: string | null;
  size: number | null;
  is_section: number;
  section_name: string | null;
  created_at: string;
}

function rowToContext(row: ContextRow): Context {
  return {
    id: row.id,
    type: row.type as ContextType,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags) as string[],
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    parent_id: row.parent_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToProjectFile(row: ProjectFileRow): ProjectFile {
  return {
    id: row.id,
    project_id: row.project_id,
    path: row.path,
    content: row.content,
    language: row.language,
    size: row.size,
    is_section: row.is_section === 1,
    section_name: row.section_name,
    created_at: row.created_at,
  };
}

export interface AddContextInput {
  type: ContextType;
  title: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  parent_id?: number | null;
}

export function addContext(db: DB, input: AddContextInput): Context {
  const stmt = db.prepare(
    `INSERT INTO contexts (type, title, content, tags, metadata, parent_id)
     VALUES (@type, @title, @content, @tags, @metadata, @parent_id)
     RETURNING *`,
  );
  const row = stmt.get({
    type: input.type,
    title: input.title,
    content: input.content ?? "",
    tags: JSON.stringify(input.tags ?? []),
    metadata: JSON.stringify(input.metadata ?? {}),
    parent_id: input.parent_id ?? null,
  }) as ContextRow;
  return rowToContext(row);
}

export interface UpdateContextInput {
  id: number;
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  parent_id?: number | null;
}

export function updateContext(db: DB, input: UpdateContextInput): Context | null {
  const existing = getContext(db, input.id);
  if (!existing) return null;

  const merged = {
    title: input.title ?? existing.title,
    content: input.content ?? existing.content,
    tags: JSON.stringify(input.tags ?? existing.tags),
    metadata: JSON.stringify(input.metadata ?? existing.metadata),
    parent_id: input.parent_id === undefined ? existing.parent_id : input.parent_id,
  };

  const stmt = db.prepare(
    `UPDATE contexts
     SET title = @title,
         content = @content,
         tags = @tags,
         metadata = @metadata,
         parent_id = @parent_id,
         updated_at = datetime('now')
     WHERE id = @id
     RETURNING *`,
  );
  const row = stmt.get({ id: input.id, ...merged }) as ContextRow | undefined;
  return row ? rowToContext(row) : null;
}

export function getContext(db: DB, id: number): Context | null {
  const row = db.prepare(`SELECT * FROM contexts WHERE id = ?`).get(id) as
    | ContextRow
    | undefined;
  return row ? rowToContext(row) : null;
}

export function deleteContext(db: DB, id: number): boolean {
  const info = db.prepare(`DELETE FROM contexts WHERE id = ?`).run(id);
  return info.changes > 0;
}

export interface ListContextsFilter {
  type?: ContextType;
  tag?: string;
  parent_id?: number | null;
  limit?: number;
  offset?: number;
}

export function listContexts(db: DB, filter: ListContextsFilter = {}): Context[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter.type) {
    clauses.push("type = @type");
    params.type = filter.type;
  }
  if (filter.tag) {
    clauses.push("EXISTS (SELECT 1 FROM json_each(contexts.tags) WHERE value = @tag)");
    params.tag = filter.tag;
  }
  if (filter.parent_id !== undefined) {
    if (filter.parent_id === null) {
      clauses.push("parent_id IS NULL");
    } else {
      clauses.push("parent_id = @parent_id");
      params.parent_id = filter.parent_id;
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;

  const rows = db
    .prepare(
      `SELECT * FROM contexts ${where}
       ORDER BY updated_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset }) as ContextRow[];

  return rows.map(rowToContext);
}

export interface SearchContextsFilter {
  query: string;
  type?: ContextType;
  limit?: number;
}

export function searchContexts(db: DB, filter: SearchContextsFilter): Context[] {
  const like = `%${filter.query.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  const clauses: string[] = [
    "(title LIKE @like ESCAPE '\\' OR content LIKE @like ESCAPE '\\' OR tags LIKE @like ESCAPE '\\')",
  ];
  const params: Record<string, unknown> = { like, limit: filter.limit ?? 50 };

  if (filter.type) {
    clauses.push("type = @type");
    params.type = filter.type;
  }

  const rows = db
    .prepare(
      `SELECT * FROM contexts
       WHERE ${clauses.join(" AND ")}
       ORDER BY updated_at DESC
       LIMIT @limit`,
    )
    .all(params) as ContextRow[];

  return rows.map(rowToContext);
}

export interface AddProjectFileInput {
  project_id: number;
  path: string;
  content?: string | null;
  language?: string | null;
  size?: number | null;
  is_section?: boolean;
  section_name?: string | null;
}

export function addProjectFile(db: DB, input: AddProjectFileInput): ProjectFile {
  const row = db
    .prepare(
      `INSERT INTO project_files (project_id, path, content, language, size, is_section, section_name)
       VALUES (@project_id, @path, @content, @language, @size, @is_section, @section_name)
       RETURNING *`,
    )
    .get({
      project_id: input.project_id,
      path: input.path,
      content: input.content ?? null,
      language: input.language ?? null,
      size: input.size ?? null,
      is_section: input.is_section ? 1 : 0,
      section_name: input.section_name ?? null,
    }) as ProjectFileRow;
  return rowToProjectFile(row);
}

export function listProjectFiles(
  db: DB,
  projectId: number,
  sectionName?: string,
): ProjectFile[] {
  const rows = sectionName
    ? (db
        .prepare(
          `SELECT * FROM project_files WHERE project_id = ? AND section_name = ? ORDER BY path`,
        )
        .all(projectId, sectionName) as ProjectFileRow[])
    : (db
        .prepare(`SELECT * FROM project_files WHERE project_id = ? ORDER BY path`)
        .all(projectId) as ProjectFileRow[]);
  return rows.map(rowToProjectFile);
}

export function getProjectFile(db: DB, id: number): ProjectFile | null {
  const row = db.prepare(`SELECT * FROM project_files WHERE id = ?`).get(id) as
    | ProjectFileRow
    | undefined;
  return row ? rowToProjectFile(row) : null;
}

export function deleteProjectFile(db: DB, id: number): boolean {
  return db.prepare(`DELETE FROM project_files WHERE id = ?`).run(id).changes > 0;
}

export function countContexts(db: DB): Record<ContextType, number> {
  const counts = Object.fromEntries(CONTEXT_TYPES.map((t) => [t, 0])) as Record<
    ContextType,
    number
  >;
  const rows = db
    .prepare(`SELECT type, COUNT(*) as n FROM contexts GROUP BY type`)
    .all() as { type: string; n: number }[];
  for (const row of rows) {
    if (row.type in counts) counts[row.type as ContextType] = row.n;
  }
  return counts;
}
