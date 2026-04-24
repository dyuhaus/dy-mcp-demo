import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, type DB } from "../src/db.js";
import { importProject, walkProject } from "../src/importer.js";

describe("importer", () => {
  let root: string;
  let db: DB;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "dy-mcp-imp-"));
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "node_modules", "ignored-pkg"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "sample",
        version: "0.1.0",
        description: "toy",
      }),
    );
    writeFileSync(join(root, ".gitignore"), "secrets/\n*.log\n");
    writeFileSync(join(root, "README.md"), "# Sample\n\nA toy project.");
    writeFileSync(join(root, "src", "index.ts"), "export const x = 1;\n");
    writeFileSync(join(root, "src", "util.ts"), "export function u() {}\n");
    writeFileSync(join(root, "debug.log"), "noisy noisy");
    mkdirSync(join(root, "secrets"), { recursive: true });
    writeFileSync(join(root, "secrets", "k.txt"), "shh");
    writeFileSync(
      join(root, "node_modules", "ignored-pkg", "index.js"),
      "module.exports = {}",
    );

    db = openDatabase(":memory:");
  });

  afterAll(() => {
    db.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("respects .gitignore and default excludes", async () => {
    const walked = await walkProject(root);
    const rel = walked.map((f) => f.relPath.replace(/\\/g, "/")).sort();
    expect(rel).toEqual([
      ".gitignore",
      "README.md",
      "package.json",
      "src/index.ts",
      "src/util.ts",
    ]);
  });

  it("imports into db with file count and metadata", async () => {
    const result = await importProject(db, {
      path: root,
      name: "sample",
      description: "under test",
      tags: ["test"],
    });
    expect(result.fileCount).toBe(5);
    expect(result.context.type).toBe("project");
    expect(result.context.title).toBe("sample");
    expect(result.context.tags).toEqual(["test"]);
    const meta = result.context.metadata as { languages: Record<string, number> };
    expect(meta.languages.typescript).toBe(2);
    expect(meta.languages.markdown).toBe(1);
    expect(meta.languages.json).toBe(1);
    expect(result.bytesStored).toBeGreaterThan(0);
    expect(result.tree).toContain("src/");
  });
});
