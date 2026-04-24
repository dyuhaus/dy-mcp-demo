import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DB } from "./db.js";
import { importProject, importProjectSection } from "./importer.js";
import {
  CONTEXT_TYPES,
  type Context,
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

function jsonContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function textContent(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

function summarizeContext(ctx: Context): string {
  const tags = ctx.tags.length ? ` [${ctx.tags.join(", ")}]` : "";
  const excerpt =
    ctx.content.length > 160 ? `${ctx.content.slice(0, 160).trim()}…` : ctx.content;
  return `#${ctx.id} (${ctx.type})${tags} ${ctx.title}\n  ${excerpt.replace(/\n/g, " ")}`;
}

export function buildMcpServer(db: DB): McpServer {
  const server = new McpServer(
    {
      name: "dy-mcp-demo",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        "Personal context server for the user. Use these tools to read and write " +
        "their projects, ideas, preferences, writing style, skills, and general " +
        "personal context. Call `get_personal_context` at the start of a session to " +
        "orient yourself. Use `import_project` or `import_project_section` to bring " +
        "a codebase the user is working on into long-term memory.",
    },
  );

  const typeEnum = z.enum(CONTEXT_TYPES);

  server.registerTool(
    "list_contexts",
    {
      title: "List contexts",
      description:
        "List personal-context entries. Optionally filter by type or tag. Returns id, type, title, tags, and a short excerpt. Types: project, idea, preference, writing_style, skill, general.",
      inputSchema: {
        type: typeEnum.optional(),
        tag: z.string().optional(),
        parent_id: z.number().int().nullable().optional(),
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => {
      const items = listContexts(db, args);
      if (items.length === 0) return textContent("(no contexts found)");
      return textContent(items.map(summarizeContext).join("\n"));
    },
  );

  server.registerTool(
    "get_context",
    {
      title: "Get context",
      description:
        "Fetch a single context entry by id. Returns the full content, tags, metadata, and timestamps.",
      inputSchema: {
        id: z.number().int(),
      },
    },
    async ({ id }) => {
      const ctx = getContext(db, id);
      if (!ctx) return textContent(`No context with id ${id}`);
      return jsonContent(ctx);
    },
  );

  server.registerTool(
    "add_context",
    {
      title: "Add context",
      description:
        "Create a new personal-context entry. Use this whenever the user shares a new project, idea, preference, writing sample, or skill worth remembering.",
      inputSchema: {
        type: typeEnum,
        title: z.string().min(1),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
        parent_id: z.number().int().nullable().optional(),
      },
    },
    async (args) => {
      const ctx = addContext(db, args);
      return jsonContent({ ok: true, id: ctx.id, context: ctx });
    },
  );

  server.registerTool(
    "update_context",
    {
      title: "Update context",
      description:
        "Update an existing context entry. Only the provided fields are changed. Use this to refine preferences or expand a project as it evolves.",
      inputSchema: {
        id: z.number().int(),
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
        parent_id: z.number().int().nullable().optional(),
      },
    },
    async (args) => {
      const ctx = updateContext(db, args);
      if (!ctx) return textContent(`No context with id ${args.id}`);
      return jsonContent({ ok: true, context: ctx });
    },
  );

  server.registerTool(
    "delete_context",
    {
      title: "Delete context",
      description:
        "Delete a context entry. Cascades to any project files attached to a project context. Ask the user to confirm before destructive actions.",
      inputSchema: {
        id: z.number().int(),
      },
    },
    async ({ id }) => {
      const ok = deleteContext(db, id);
      return jsonContent({ ok, id });
    },
  );

  server.registerTool(
    "search_contexts",
    {
      title: "Search contexts",
      description:
        "Free-text search across title, content, and tags of all context entries. Case-insensitive substring match.",
      inputSchema: {
        query: z.string().min(1),
        type: typeEnum.optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args) => {
      const items = searchContexts(db, args);
      if (items.length === 0) return textContent("(no matches)");
      return textContent(items.map(summarizeContext).join("\n"));
    },
  );

  server.registerTool(
    "get_personal_context",
    {
      title: "Get personal context overview",
      description:
        "Return a compact overview of the user's personal context: counts by type, writing style, active preferences, and recent projects. Call this at the start of a session to orient yourself.",
      inputSchema: {},
    },
    async () => {
      const counts = countContexts(db);
      const writing = listContexts(db, { type: "writing_style", limit: 5 });
      const prefs = listContexts(db, { type: "preference", limit: 25 });
      const skills = listContexts(db, { type: "skill", limit: 25 });
      const recentProjects = listContexts(db, { type: "project", limit: 5 });

      return jsonContent({
        counts,
        writing_style: writing.map((c) => ({
          id: c.id,
          title: c.title,
          content: c.content,
        })),
        preferences: prefs.map((c) => ({
          id: c.id,
          title: c.title,
          tags: c.tags,
          content: c.content,
        })),
        skills: skills.map((c) => ({ id: c.id, title: c.title, tags: c.tags })),
        recent_projects: recentProjects.map((c) => ({
          id: c.id,
          title: c.title,
          metadata: c.metadata,
          updated_at: c.updated_at,
        })),
      });
    },
  );

  server.registerTool(
    "import_project",
    {
      title: "Import project",
      description:
        "Import a local project directory as a `project` context. Walks the directory (respecting .gitignore), stores a file tree and optional file contents, and attaches metadata (languages, file count, source path). Use this when the user wants to remember the current project they're working on.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .describe("Absolute or relative path to the project root."),
        name: z
          .string()
          .optional()
          .describe("Override the project name. Defaults to the directory name."),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        include_content: z
          .boolean()
          .optional()
          .describe("Whether to store file contents (default true)."),
        max_file_bytes: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Skip storing content for files larger than this (default 131072 = 128 KiB).",
          ),
        max_total_files: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Cap on number of files to index (default 5000)."),
      },
    },
    async (args) => {
      const result = await importProject(db, {
        path: args.path,
        name: args.name,
        description: args.description,
        tags: args.tags,
        includeContent: args.include_content,
        maxFileBytes: args.max_file_bytes,
        maxTotalFiles: args.max_total_files,
      });
      return jsonContent({
        ok: true,
        project_id: result.context.id,
        title: result.context.title,
        file_count: result.fileCount,
        bytes_stored: result.bytesStored,
        tree_preview: result.tree.split("\n").slice(0, 40).join("\n"),
      });
    },
  );

  server.registerTool(
    "import_project_section",
    {
      title: "Import project section",
      description:
        "Import a subdirectory or specific file as a named section of a project. Attach to an existing project context with `parent_project_id`, or omit it to create a standalone section. Useful for zooming in on the part the user is actively working on.",
      inputSchema: {
        path: z.string().min(1).describe("Path to the file or directory to import."),
        section_name: z
          .string()
          .min(1)
          .describe("A label for this section (e.g. 'auth', 'frontend/components')."),
        parent_project_id: z
          .number()
          .int()
          .optional()
          .describe(
            "Attach files to this existing project context. Omit to create a new standalone section.",
          ),
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        include_content: z.boolean().optional(),
        max_file_bytes: z.number().int().positive().optional(),
        max_total_files: z.number().int().positive().optional(),
      },
    },
    async (args) => {
      const result = await importProjectSection(db, {
        path: args.path,
        section_name: args.section_name,
        parent_project_id: args.parent_project_id,
        title: args.title,
        description: args.description,
        tags: args.tags,
        includeContent: args.include_content,
        maxFileBytes: args.max_file_bytes,
        maxTotalFiles: args.max_total_files,
      });
      return jsonContent({
        ok: true,
        project_id: result.context.id,
        attached_to_project_id: result.attachedToProjectId,
        section_name: args.section_name,
        file_count: result.fileCount,
        bytes_stored: result.bytesStored,
      });
    },
  );

  server.registerTool(
    "list_project_files",
    {
      title: "List project files",
      description:
        "List files stored under a project context, optionally filtered by section name.",
      inputSchema: {
        project_id: z.number().int(),
        section_name: z.string().optional(),
      },
    },
    async ({ project_id, section_name }) => {
      const files = listProjectFiles(db, project_id, section_name);
      if (files.length === 0) return textContent("(no files)");
      const lines = files.map(
        (f) =>
          `#${f.id} ${f.path}${f.language ? ` [${f.language}]` : ""}${
            f.section_name ? ` (section: ${f.section_name})` : ""
          }${f.size != null ? ` ${f.size}B` : ""}`,
      );
      return textContent(lines.join("\n"));
    },
  );

  server.registerTool(
    "get_project_file",
    {
      title: "Get project file",
      description: "Fetch the stored contents of a project file by its id.",
      inputSchema: {
        id: z.number().int(),
      },
    },
    async ({ id }) => {
      const file = getProjectFile(db, id);
      if (!file) return textContent(`No project file with id ${id}`);
      if (file.content == null) {
        return jsonContent({
          id: file.id,
          path: file.path,
          language: file.language,
          size: file.size,
          note: "Content not stored (binary or exceeded size limit).",
        });
      }
      return textContent(
        `# ${file.path}${file.language ? ` (${file.language})` : ""}\n\n${file.content}`,
      );
    },
  );

  server.registerTool(
    "delete_project_file",
    {
      title: "Delete project file",
      description:
        "Remove a single stored project file by id. Does not affect the source on disk.",
      inputSchema: {
        id: z.number().int(),
      },
    },
    async ({ id }) => {
      const ok = deleteProjectFile(db, id);
      return jsonContent({ ok, id });
    },
  );

  server.registerResource(
    "personal-context-overview",
    "context://overview",
    {
      title: "Personal context overview",
      description: "High-level summary of the user's personal context store.",
      mimeType: "application/json",
    },
    async (uri) => {
      const counts = countContexts(db);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                counts,
                db_path: process.env.DY_MCP_DB_PATH ?? "~/.dy-mcp/context.db",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  for (const type of CONTEXT_TYPES) {
    server.registerResource(
      `personal-context-${type}`,
      `context://${type}`,
      {
        title: `Personal context: ${type}`,
        description: `All ${type} entries.`,
        mimeType: "application/json",
      },
      async (uri) => {
        const items = listContexts(db, { type, limit: 500 });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(items, null, 2),
            },
          ],
        };
      },
    );
  }

  return server;
}
