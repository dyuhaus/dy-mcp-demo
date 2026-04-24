#!/usr/bin/env node
/**
 * Wipes the demo DB and reseeds it with a fictional persona.
 *
 * Persona: Alex Quinn, a writer-developer building small tools for newsletter
 * authors. The data is invented but internally consistent so the six context
 * types and the project-file browser all have something to show.
 *
 * Run standalone:   node dist/scripts/seed.js
 * Or via npm:       npm run seed
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "../src/db.js";
import { addContext } from "../src/storage.js";
import { importProject } from "../src/importer.js";

async function seed(): Promise<void> {
  const db = openDatabase();

  db.prepare("DELETE FROM project_files").run();
  db.prepare("DELETE FROM contexts").run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('contexts','project_files')").run();

  addContext(db, {
    type: "writing_style",
    title: "Plain-spoken with a dry wit",
    content:
      "Alex writes short sentences. Concrete nouns over abstract ones. Humor only when it's earned — never as garnish. First draft is always too long; the final read cuts 30%.",
    tags: ["voice", "newsletter"],
    metadata: {
      example:
        "The reader owes you nothing. They clicked because the subject line promised something specific. Deliver that thing before paragraph three or they're gone.",
      used: 47,
    },
  });

  const quillId = addContext(db, {
    type: "project",
    title: "quill-md",
    content:
      "Tiny markdown-to-HTML renderer for newsletter drafts. Zero dependencies. Handles headings, bold, italic, code spans, fenced blocks, and inline links. Shipped v0.2 last week after a reader reported that backticks inside links were being double-escaped.",
    tags: ["library", "javascript", "markdown"],
    metadata: {
      status: "in_progress",
      progress: 0.65,
      updated: "2 days ago",
    },
  }).id;

  addContext(db, {
    type: "project",
    title: "Fieldnotes",
    content:
      "A weekly newsletter about how writers actually work — interviews, workflows, honest failures. 1,400 subscribers. Published every Thursday at 7am ET.",
    tags: ["newsletter", "writing"],
    metadata: {
      status: "in_progress",
      progress: 0.9,
      updated: "6 hours ago",
    },
  });

  addContext(db, {
    type: "project",
    title: "Commonplace book (personal)",
    content:
      "Rolling collection of quotes, passages, and excerpts worth returning to. Categorized by mood, not by author. Currently ~240 entries.",
    tags: ["reading", "archive"],
    metadata: {
      status: "done",
      progress: 1,
      updated: "archived",
    },
  });

  addContext(db, {
    type: "idea",
    title: "Field guide: subject lines that don't lie",
    content:
      "A short guide collecting the subject lines from Fieldnotes that outperformed — and the ones that flopped — with notes on why. Maybe a free companion PDF for subscribers.",
    tags: ["newsletter", "content-idea"],
    metadata: {},
  });

  addContext(db, {
    type: "idea",
    title: "Add YAML front-matter to quill-md",
    content:
      "Let authors write title, date, tags at the top of the .md file and have the renderer parse them. Matches the pattern most static site generators already use.",
    tags: ["quill-md", "feature"],
    metadata: {},
  });

  addContext(db, {
    type: "preference",
    title: "No AI-generated imagery",
    content:
      "Don't suggest or insert AI-generated images in newsletters or drafts. Readers notice and it cheapens the voice.",
    tags: ["editorial"],
    metadata: { cat: "voice", value: "never use AI-generated images" },
  });

  addContext(db, {
    type: "preference",
    title: "Editor: Helix, terminal-first",
    content:
      "All editing happens in Helix with the Catppuccin Mocha theme. No VS Code, no JetBrains. When giving me code, assume I'll paste it into a terminal-based editor.",
    tags: ["environment"],
    metadata: { cat: "env", value: "Helix + Catppuccin Mocha" },
  });

  addContext(db, {
    type: "preference",
    title: "Meetings only on Wednesdays",
    content:
      "Batch calls and meetings to Wednesdays. The other four days are heads-down writing and building. Decline cheerfully but firmly.",
    tags: ["work"],
    metadata: { cat: "work", value: "Wednesdays only" },
  });

  addContext(db, {
    type: "skill",
    title: "Interviewing",
    content:
      "Ten years of journalism before switching to software. Comfortable running long-form interviews — knows when to let silence do the work.",
    tags: ["communication"],
    metadata: {},
  });

  addContext(db, {
    type: "general",
    title: "Based in Lisbon, working in EN/PT",
    content:
      "Moved from Boston in 2023. Primary work language is English. Can conduct interviews in Portuguese. GMT+0 (or +1 in summer).",
    tags: ["bio"],
    metadata: {},
  });

  const fixturePath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "fixtures",
    "sample-project",
  );
  const result = await importProject(db, {
    path: fixturePath,
    name: "quill-md (source)",
    description:
      "Source tree for the quill-md renderer. Imported so you can browse files via list_project_files / get_project_file.",
    tags: ["imported", "source"],
    includeContent: true,
  });

  const childId = result.context.id;
  db.prepare("UPDATE contexts SET parent_id = ? WHERE id = ?").run(quillId, childId);

  const total = db
    .prepare("SELECT COUNT(*) AS n FROM contexts")
    .get() as { n: number };
  console.log(
    `seeded ${total.n} contexts and ${result.fileCount} project files (${result.bytesStored} bytes).`,
  );
  db.close();
}

seed().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
