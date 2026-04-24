import test from "node:test";
import assert from "node:assert/strict";
import { render } from "../src/index.js";

test("renders a heading", () => {
  assert.equal(render("# Hi"), "<h1>Hi</h1>");
});

test("renders bold and italic", () => {
  assert.equal(render("**bold** and *italic*"), "<p><strong>bold</strong> and <em>italic</em></p>");
});

test("renders a fenced code block", () => {
  const md = "```\nlet x = 1;\n```";
  assert.equal(render(md), "<pre><code>let x = 1;</code></pre>");
});
