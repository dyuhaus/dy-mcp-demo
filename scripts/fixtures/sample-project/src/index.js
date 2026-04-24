import { parseBlocks } from "./blocks.js";
import { renderInline } from "./inline.js";

export function render(markdown) {
  const blocks = parseBlocks(markdown);
  return blocks.map(renderBlock).join("\n");
}

function renderBlock(block) {
  switch (block.type) {
    case "heading":
      return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
    case "paragraph":
      return `<p>${renderInline(block.text)}</p>`;
    case "code":
      return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
    case "blank":
      return "";
    default:
      return "";
  }
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
