import { CONTEXT_TYPES } from "./storage.js";

export interface ToolParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ToolInfo {
  name: string;
  title: string;
  description: string;
  parameters: ToolParam[];
}

export interface ResourceInfo {
  name: string;
  uri: string;
  description: string;
}

const TYPE_ENUM = `enum(${CONTEXT_TYPES.join(" | ")})`;

export const TOOL_CATALOG: ToolInfo[] = [
  {
    name: "list_contexts",
    title: "List contexts",
    description:
      "List personal-context entries. Optionally filter by type or tag. Returns id, type, title, tags, and a short excerpt.",
    parameters: [
      {
        name: "type",
        type: TYPE_ENUM,
        required: false,
        description: "Filter to a single type.",
      },
      {
        name: "tag",
        type: "string",
        required: false,
        description: "Only entries with this tag.",
      },
      {
        name: "parent_id",
        type: "integer | null",
        required: false,
        description: "Children of this context; null for roots.",
      },
      {
        name: "limit",
        type: "integer",
        required: false,
        description: "Max rows. Default 100.",
      },
      {
        name: "offset",
        type: "integer",
        required: false,
        description: "Pagination offset.",
      },
    ],
  },
  {
    name: "get_context",
    title: "Get context",
    description:
      "Fetch a single context entry by id. Returns the full content, tags, metadata, and timestamps.",
    parameters: [{ name: "id", type: "integer", required: true }],
  },
  {
    name: "add_context",
    title: "Add context",
    description:
      "Create a new personal-context entry. Use whenever the user shares a new project, idea, preference, writing sample, or skill worth remembering.",
    parameters: [
      { name: "type", type: TYPE_ENUM, required: true },
      { name: "title", type: "string", required: true },
      { name: "content", type: "string", required: false },
      { name: "tags", type: "string[]", required: false },
      {
        name: "metadata",
        type: "object",
        required: false,
        description: "Free-form JSON bag — e.g. {status, progress, cat, example, value}.",
      },
      { name: "parent_id", type: "integer | null", required: false },
    ],
  },
  {
    name: "update_context",
    title: "Update context",
    description:
      "Update an existing context. Only provided fields change — refine preferences, expand projects as they evolve.",
    parameters: [
      { name: "id", type: "integer", required: true },
      { name: "title", type: "string", required: false },
      { name: "content", type: "string", required: false },
      { name: "tags", type: "string[]", required: false },
      { name: "metadata", type: "object", required: false },
      { name: "parent_id", type: "integer | null", required: false },
    ],
  },
  {
    name: "delete_context",
    title: "Delete context",
    description:
      "Delete a context entry. Cascades to any project files attached to a project context. Ask before destructive actions.",
    parameters: [{ name: "id", type: "integer", required: true }],
  },
  {
    name: "search_contexts",
    title: "Search contexts",
    description:
      "Free-text search across title, content, and tags. Case-insensitive substring match.",
    parameters: [
      { name: "query", type: "string", required: true },
      { name: "type", type: TYPE_ENUM, required: false },
      { name: "limit", type: "integer", required: false, description: "Default 50." },
    ],
  },
  {
    name: "get_personal_context",
    title: "Get personal context overview",
    description:
      "A compact overview: counts by type, writing style, active preferences, recent projects. Call at the start of a session to orient yourself.",
    parameters: [],
  },
  {
    name: "import_project",
    title: "Import project",
    description:
      "Import a local project directory as a `project` context. Walks the directory respecting .gitignore, stores a file tree + optional file contents, attaches metadata (languages, file count, source path).",
    parameters: [
      {
        name: "path",
        type: "string",
        required: true,
        description: "Absolute or relative path to the project root.",
      },
      {
        name: "name",
        type: "string",
        required: false,
        description: "Override name. Defaults to directory name.",
      },
      { name: "description", type: "string", required: false },
      { name: "tags", type: "string[]", required: false },
      {
        name: "include_content",
        type: "boolean",
        required: false,
        description: "Store file contents. Default true.",
      },
      {
        name: "max_file_bytes",
        type: "integer",
        required: false,
        description: "Skip content for files larger than this. Default 131072 (128 KiB).",
      },
      {
        name: "max_total_files",
        type: "integer",
        required: false,
        description: "Cap on indexed files. Default 5000.",
      },
    ],
  },
  {
    name: "import_project_section",
    title: "Import project section",
    description:
      "Import a subdirectory or file as a named section. Attach to an existing project_id or omit to create a standalone section. Useful for zooming in on the part the user is actively working on.",
    parameters: [
      { name: "path", type: "string", required: true },
      {
        name: "section_name",
        type: "string",
        required: true,
        description: "e.g. 'auth', 'frontend/components'.",
      },
      { name: "parent_project_id", type: "integer", required: false },
      { name: "title", type: "string", required: false },
      { name: "description", type: "string", required: false },
      { name: "tags", type: "string[]", required: false },
      { name: "include_content", type: "boolean", required: false },
      { name: "max_file_bytes", type: "integer", required: false },
      { name: "max_total_files", type: "integer", required: false },
    ],
  },
  {
    name: "list_project_files",
    title: "List project files",
    description:
      "List files stored under a project context, optionally filtered by section name.",
    parameters: [
      { name: "project_id", type: "integer", required: true },
      { name: "section_name", type: "string", required: false },
    ],
  },
  {
    name: "get_project_file",
    title: "Get project file",
    description: "Fetch the stored contents of a project file by its id.",
    parameters: [{ name: "id", type: "integer", required: true }],
  },
  {
    name: "delete_project_file",
    title: "Delete project file",
    description:
      "Remove a single stored project file by id. Does not affect the source on disk.",
    parameters: [{ name: "id", type: "integer", required: true }],
  },
];

export const RESOURCE_CATALOG: ResourceInfo[] = [
  {
    name: "personal-context-overview",
    uri: "context://overview",
    description:
      "High-level JSON summary of the personal-context store — counts by type and the DB path.",
  },
  ...CONTEXT_TYPES.map((type) => ({
    name: `personal-context-${type}`,
    uri: `context://${type}`,
    description: `All ${type} entries as a JSON array (up to 500).`,
  })),
];
