import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import ignore, { type Ignore } from "ignore";
import type { DB } from "./db.js";
import { addContext, addProjectFile, type Context, getContext } from "./storage.js";

const DEFAULT_EXCLUDES = [
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "target",
  ".gradle",
  ".idea",
  ".vscode",
  ".DS_Store",
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cc",
  ".cs",
  ".php",
  ".pl",
  ".lua",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".sql",
  ".graphql",
  ".proto",
  ".md",
  ".mdx",
  ".rst",
  ".txt",
  ".adoc",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".env",
  ".conf",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  ".astro",
  ".xml",
  ".tex",
]);

const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".hpp": "cpp",
  ".cc": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".pl": "perl",
  ".lua": "lua",
  ".sh": "shell",
  ".bash": "shell",
  ".zsh": "shell",
  ".fish": "shell",
  ".sql": "sql",
  ".graphql": "graphql",
  ".proto": "proto",
  ".md": "markdown",
  ".mdx": "mdx",
  ".rst": "rst",
  ".txt": "text",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",
  ".xml": "xml",
};

function detectLanguage(path: string): string | null {
  const ext = extname(path).toLowerCase();
  return LANGUAGE_BY_EXT[ext] ?? null;
}

function isTextFile(path: string): boolean {
  const ext = extname(path).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  const base = basename(path).toLowerCase();
  return (
    base === "readme" ||
    base === "license" ||
    base === "makefile" ||
    base === "dockerfile" ||
    base.startsWith(".env")
  );
}

async function readGitignore(root: string): Promise<Ignore> {
  const ig = ignore();
  ig.add(DEFAULT_EXCLUDES);
  try {
    const content = await readFile(join(root, ".gitignore"), "utf8");
    ig.add(content);
  } catch {
    /* no gitignore */
  }
  return ig;
}

export interface WalkOptions {
  maxFileBytes?: number;
  maxTotalFiles?: number;
}

export interface WalkedFile {
  absPath: string;
  relPath: string;
  size: number;
  isText: boolean;
}

export async function walkProject(
  root: string,
  options: WalkOptions = {},
): Promise<WalkedFile[]> {
  const maxFiles = options.maxTotalFiles ?? 5000;
  const ig = await readGitignore(root);
  const results: WalkedFile[] = [];

  async function walk(dir: string): Promise<void> {
    if (results.length >= maxFiles) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      const absPath = join(dir, entry.name);
      const relPath = relative(root, absPath).split("\\").join("/");
      if (!relPath) continue;
      const checkPath = entry.isDirectory() ? `${relPath}/` : relPath;
      if (ig.ignores(checkPath)) continue;

      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(absPath);
      } else if (entry.isFile()) {
        let st;
        try {
          st = await stat(absPath);
        } catch {
          continue;
        }
        results.push({
          absPath,
          relPath,
          size: st.size,
          isText: isTextFile(relPath),
        });
      }
    }
  }

  await walk(root);
  return results.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

function buildTree(paths: string[]): string {
  const root: Record<string, unknown> = {};
  for (const p of paths) {
    const parts = p.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      if (isLeaf) {
        node[part] = null;
      } else {
        if (!(part in node) || node[part] === null) node[part] = {};
        node = node[part] as Record<string, unknown>;
      }
    }
  }

  const lines: string[] = [];
  function render(node: Record<string, unknown>, prefix: string): void {
    const keys = Object.keys(node).sort((a, b) => {
      const aDir = node[a] !== null;
      const bDir = node[b] !== null;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.localeCompare(b);
    });
    keys.forEach((key, idx) => {
      const last = idx === keys.length - 1;
      const connector = last ? "└── " : "├── ";
      const child = node[key];
      lines.push(`${prefix}${connector}${key}${child !== null ? "/" : ""}`);
      if (child !== null) {
        render(child as Record<string, unknown>, prefix + (last ? "    " : "│   "));
      }
    });
  }
  render(root, "");
  return lines.join("\n");
}

async function readProjectMetadata(root: string): Promise<{
  suggestedName: string;
  summary: string;
  languages: Record<string, number>;
}> {
  const suggestedName = basename(resolve(root));
  const summaryParts: string[] = [];
  const languages: Record<string, number> = {};

  const manifests: Array<[string, (raw: string) => string | null]> = [
    [
      "package.json",
      (raw) => {
        try {
          const pkg = JSON.parse(raw) as {
            name?: string;
            description?: string;
            version?: string;
          };
          const bits = [pkg.name, pkg.version, pkg.description].filter(Boolean);
          return bits.length ? `package.json: ${bits.join(" — ")}` : null;
        } catch {
          return null;
        }
      },
    ],
    ["pyproject.toml", (raw) => `pyproject.toml present (${raw.length} bytes)`],
    ["Cargo.toml", (raw) => `Cargo.toml present (${raw.length} bytes)`],
    ["go.mod", (raw) => `go.mod: ${raw.split("\n")[0] ?? ""}`],
  ];

  for (const [name, fmt] of manifests) {
    try {
      const raw = await readFile(join(root, name), "utf8");
      const line = fmt(raw);
      if (line) summaryParts.push(line);
    } catch {
      /* not present */
    }
  }

  for (const readmeName of ["README.md", "README.rst", "README.txt", "README"]) {
    try {
      const raw = await readFile(join(root, readmeName), "utf8");
      const excerpt = raw.slice(0, 500).trim();
      if (excerpt) summaryParts.push(`README:\n${excerpt}`);
      break;
    } catch {
      /* not present */
    }
  }

  return {
    suggestedName,
    summary: summaryParts.join("\n\n"),
    languages,
  };
}

export interface ImportProjectInput {
  path: string;
  name?: string;
  description?: string;
  tags?: string[];
  includeContent?: boolean;
  maxFileBytes?: number;
  maxTotalFiles?: number;
}

export interface ImportProjectResult {
  context: Context;
  fileCount: number;
  tree: string;
  bytesStored: number;
}

export async function importProject(
  db: DB,
  input: ImportProjectInput,
): Promise<ImportProjectResult> {
  const root = resolve(input.path);
  const st = await stat(root);
  if (!st.isDirectory()) {
    throw new Error(`Not a directory: ${root}`);
  }

  const meta = await readProjectMetadata(root);
  const walked = await walkProject(root, {
    maxTotalFiles: input.maxTotalFiles,
  });
  const tree = buildTree(walked.map((f) => f.relPath));
  const includeContent = input.includeContent ?? true;
  const maxFileBytes = input.maxFileBytes ?? 128 * 1024;

  for (const file of walked) {
    const ext = extname(file.relPath).toLowerCase();
    const lang = LANGUAGE_BY_EXT[ext] ?? null;
    const counter = meta.languages;
    const key = lang ?? "other";
    counter[key] = (counter[key] ?? 0) + 1;
  }

  const contentParts: string[] = [];
  if (input.description) contentParts.push(input.description);
  if (meta.summary) contentParts.push(meta.summary);
  contentParts.push(`File tree (${walked.length} files):\n\`\`\`\n${tree}\n\`\`\``);
  const initialContent = contentParts.join("\n\n");

  const ctx = addContext(db, {
    type: "project",
    title: input.name ?? meta.suggestedName,
    content: initialContent,
    tags: input.tags ?? [],
    metadata: {
      source_path: root,
      file_count: walked.length,
      languages: meta.languages,
      imported_at: new Date().toISOString(),
    },
  });

  let bytesStored = 0;
  for (const file of walked) {
    let content: string | null = null;
    if (includeContent && file.isText && file.size <= maxFileBytes) {
      try {
        content = await readFile(file.absPath, "utf8");
        bytesStored += Buffer.byteLength(content);
      } catch {
        content = null;
      }
    }
    addProjectFile(db, {
      project_id: ctx.id,
      path: file.relPath,
      content,
      language: detectLanguage(file.relPath),
      size: file.size,
    });
  }

  return { context: ctx, fileCount: walked.length, tree, bytesStored };
}

export interface ImportSectionInput {
  path: string;
  section_name: string;
  parent_project_id?: number;
  title?: string;
  description?: string;
  tags?: string[];
  includeContent?: boolean;
  maxFileBytes?: number;
  maxTotalFiles?: number;
}

export interface ImportSectionResult {
  context: Context;
  fileCount: number;
  bytesStored: number;
  attachedToProjectId: number | null;
}

export async function importProjectSection(
  db: DB,
  input: ImportSectionInput,
): Promise<ImportSectionResult> {
  const target = resolve(input.path);
  const st = await stat(target);
  const includeContent = input.includeContent ?? true;
  const maxFileBytes = input.maxFileBytes ?? 256 * 1024;

  const title = input.title ?? `${input.section_name} (${basename(target)})`;

  const ctx = input.parent_project_id
    ? null
    : addContext(db, {
        type: "project",
        title,
        content: input.description ?? `Section: ${input.section_name}`,
        tags: input.tags ?? ["section"],
        metadata: {
          source_path: target,
          section_name: input.section_name,
          is_section: true,
          imported_at: new Date().toISOString(),
        },
      });

  const projectId = input.parent_project_id ?? ctx!.id;

  const files: WalkedFile[] = [];
  if (st.isFile()) {
    files.push({
      absPath: target,
      relPath: basename(target),
      size: st.size,
      isText: isTextFile(target),
    });
  } else if (st.isDirectory()) {
    const walked = await walkProject(target, {
      maxTotalFiles: input.maxTotalFiles,
    });
    files.push(...walked);
  } else {
    throw new Error(`Unsupported path: ${target}`);
  }

  let bytesStored = 0;
  for (const file of files) {
    let content: string | null = null;
    if (includeContent && file.isText && file.size <= maxFileBytes) {
      try {
        content = await readFile(file.absPath, "utf8");
        bytesStored += Buffer.byteLength(content);
      } catch {
        content = null;
      }
    }
    addProjectFile(db, {
      project_id: projectId,
      path: file.relPath,
      content,
      language: detectLanguage(file.relPath),
      size: file.size,
      is_section: true,
      section_name: input.section_name,
    });
  }

  if (input.parent_project_id) {
    const parent = getContext(db, input.parent_project_id);
    if (!parent) throw new Error(`Parent project ${input.parent_project_id} not found`);
    return {
      context: parent,
      fileCount: files.length,
      bytesStored,
      attachedToProjectId: input.parent_project_id,
    };
  }

  return {
    context: ctx!,
    fileCount: files.length,
    bytesStored,
    attachedToProjectId: null,
  };
}
