import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type DB } from "../src/db.js";
import { addContext } from "../src/storage.js";
import { buildExport } from "../src/export.js";

describe("buildExport", () => {
  let db: DB;

  beforeEach(() => {
    db = openDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("splits projects by status and collapses preferences", () => {
    addContext(db, {
      type: "writing_style",
      title: "Slack",
      content: "direct",
      tags: ["casual"],
      metadata: { example: "yeah ok", used: 12 },
    });
    addContext(db, {
      type: "project",
      title: "Active",
      metadata: { status: "in_progress", progress: 0.5 },
    });
    addContext(db, {
      type: "project",
      title: "Shipped",
      metadata: { status: "done" },
    });
    addContext(db, { type: "idea", title: "Tiny CRM" });
    addContext(db, {
      type: "preference",
      title: "timezone",
      content: "unused",
      metadata: { cat: "env", value: "America/Los_Angeles" },
    });

    const result = buildExport(db) as {
      writing_styles: Array<{ name: string; example: string | null }>;
      projects: {
        in_progress: Array<{ name: string; progress: number }>;
        done: Array<{ name: string }>;
        ideas: Array<{ name: string }>;
      };
      preferences: Record<string, unknown>;
    };

    expect(result.writing_styles[0]).toMatchObject({
      name: "Slack",
      example: "yeah ok",
    });
    expect(result.projects.in_progress).toEqual([
      { id: expect.any(Number), name: "Active", progress: 0.5 },
    ]);
    expect(result.projects.done.map((d) => d.name)).toEqual(["Shipped"]);
    expect(result.projects.ideas.map((i) => i.name)).toEqual(["Tiny CRM"]);
    expect(result.preferences).toEqual({
      timezone: "America/Los_Angeles",
    });
  });

  it("falls back to content when preference metadata.value is missing", () => {
    addContext(db, {
      type: "preference",
      title: "editor",
      content: "neovim",
    });
    const result = buildExport(db) as { preferences: Record<string, unknown> };
    expect(result.preferences).toEqual({ editor: "neovim" });
  });
});
