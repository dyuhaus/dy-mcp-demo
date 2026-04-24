import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type DB } from "../src/db.js";
import {
  addContext,
  countContexts,
  deleteContext,
  getContext,
  listContexts,
  searchContexts,
  updateContext,
} from "../src/storage.js";

describe("storage", () => {
  let db: DB;

  beforeEach(() => {
    db = openDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("creates and reads a context", () => {
    const created = addContext(db, {
      type: "writing_style",
      title: "Slack reply",
      content: "short, lowercase",
      tags: ["casual"],
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.type).toBe("writing_style");
    expect(created.tags).toEqual(["casual"]);

    const fetched = getContext(db, created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Slack reply");
    expect(fetched?.metadata).toEqual({});
  });

  it("updates only provided fields", () => {
    const original = addContext(db, {
      type: "preference",
      title: "tone.default",
      content: "direct, warm, no filler",
      tags: ["voice"],
    });
    const updated = updateContext(db, {
      id: original.id,
      content: "terse and warm",
    });
    expect(updated?.content).toBe("terse and warm");
    expect(updated?.title).toBe("tone.default");
    expect(updated?.tags).toEqual(["voice"]);
  });

  it("returns null when updating a missing id", () => {
    const result = updateContext(db, { id: 9999, title: "ghost" });
    expect(result).toBeNull();
  });

  it("filters list by type", () => {
    addContext(db, { type: "project", title: "A" });
    addContext(db, { type: "project", title: "B" });
    addContext(db, { type: "idea", title: "C" });

    const projects = listContexts(db, { type: "project" });
    expect(projects).toHaveLength(2);
    expect(projects.map((p) => p.title).sort()).toEqual(["A", "B"]);

    const ideas = listContexts(db, { type: "idea" });
    expect(ideas).toHaveLength(1);
  });

  it("filters list by tag using json_each", () => {
    addContext(db, { type: "project", title: "tagged", tags: ["alpha", "beta"] });
    addContext(db, { type: "project", title: "untagged" });

    const matched = listContexts(db, { tag: "alpha" });
    expect(matched).toHaveLength(1);
    expect(matched[0].title).toBe("tagged");

    const unmatched = listContexts(db, { tag: "gamma" });
    expect(unmatched).toHaveLength(0);
  });

  it("searches across title, content, and tags", () => {
    addContext(db, {
      type: "writing_style",
      title: "Longform essay",
      content: "first-person, em-dashes",
      tags: ["reflective"],
    });
    addContext(db, {
      type: "writing_style",
      title: "Investor update",
      content: "metrics first",
    });

    const byTitle = searchContexts(db, { query: "essay" });
    expect(byTitle).toHaveLength(1);

    const byContent = searchContexts(db, { query: "metrics" });
    expect(byContent).toHaveLength(1);

    const byTag = searchContexts(db, { query: "reflective" });
    expect(byTag).toHaveLength(1);

    const caseInsensitive = searchContexts(db, { query: "ESSAY" });
    expect(caseInsensitive).toHaveLength(1);
  });

  it("search escapes wildcard characters", () => {
    addContext(db, { type: "general", title: "has % sign" });
    addContext(db, { type: "general", title: "just words" });

    const results = searchContexts(db, { query: "%" });
    expect(results.map((r) => r.title)).toEqual(["has % sign"]);
  });

  it("deletes a context", () => {
    const ctx = addContext(db, { type: "idea", title: "throwaway" });
    expect(deleteContext(db, ctx.id)).toBe(true);
    expect(deleteContext(db, ctx.id)).toBe(false);
    expect(getContext(db, ctx.id)).toBeNull();
  });

  it("counts contexts by type", () => {
    addContext(db, { type: "project", title: "p1" });
    addContext(db, { type: "project", title: "p2" });
    addContext(db, { type: "idea", title: "i1" });

    const counts = countContexts(db);
    expect(counts.project).toBe(2);
    expect(counts.idea).toBe(1);
    expect(counts.preference).toBe(0);
    expect(counts.writing_style).toBe(0);
  });

  it("orders list by updated_at desc", async () => {
    const first = addContext(db, { type: "general", title: "first" });
    // sqlite's datetime('now') has second-level precision; bump updated_at explicitly
    db.prepare(
      `UPDATE contexts SET updated_at = datetime('now', '-10 minutes') WHERE id = ?`,
    ).run(first.id);
    const second = addContext(db, { type: "general", title: "second" });

    const list = listContexts(db, { type: "general" });
    expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
  });

  it("round-trips metadata JSON", () => {
    const ctx = addContext(db, {
      type: "project",
      title: "has meta",
      metadata: { status: "in_progress", progress: 0.42, nested: { a: 1 } },
    });
    const fetched = getContext(db, ctx.id);
    expect(fetched?.metadata).toEqual({
      status: "in_progress",
      progress: 0.42,
      nested: { a: 1 },
    });
  });
});
