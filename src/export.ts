import type { DB } from "./db.js";
import { listContexts } from "./storage.js";

export function buildExport(db: DB): Record<string, unknown> {
  const writingStyles = listContexts(db, { type: "writing_style", limit: 500 });
  const projects = listContexts(db, { type: "project", limit: 500 });
  const ideas = listContexts(db, { type: "idea", limit: 500 });
  const preferences = listContexts(db, { type: "preference", limit: 500 });
  const skills = listContexts(db, { type: "skill", limit: 500 });

  const in_progress = [];
  const done = [];
  for (const p of projects) {
    const meta = p.metadata as { status?: string; progress?: number };
    const entry = {
      id: p.id,
      name: p.title,
      progress: typeof meta.progress === "number" ? meta.progress : 0,
    };
    if (meta.status === "done") {
      done.push({ id: p.id, name: p.title, completed_at: p.updated_at });
    } else {
      in_progress.push(entry);
    }
  }

  const prefMap: Record<string, unknown> = {};
  for (const p of preferences) {
    const meta = p.metadata as { value?: unknown };
    prefMap[p.title] = meta.value ?? p.content;
  }

  return {
    $schema: "mcp://context/v1",
    writing_styles: writingStyles.map((s) => {
      const meta = s.metadata as { example?: string; used?: number };
      return {
        id: s.id,
        name: s.title,
        description: s.content,
        example: meta.example ?? null,
        tags: s.tags,
      };
    }),
    projects: {
      in_progress,
      done,
      ideas: ideas.map((i) => ({ id: i.id, name: i.title })),
    },
    preferences: prefMap,
    skills: skills.map((s) => ({ id: s.id, name: s.title, tags: s.tags })),
  };
}
