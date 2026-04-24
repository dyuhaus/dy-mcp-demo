export function parseBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let buffer = [];
  let inCode = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", text: buffer.join("\n") });
        buffer = [];
        inCode = false;
      } else {
        flushParagraph(buffer, blocks);
        buffer = [];
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      buffer.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(buffer, blocks);
      buffer = [];
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }
    if (line.trim() === "") {
      flushParagraph(buffer, blocks);
      buffer = [];
      blocks.push({ type: "blank" });
      continue;
    }
    buffer.push(line);
  }
  flushParagraph(buffer, blocks);
  return blocks;
}

function flushParagraph(buffer, blocks) {
  if (buffer.length === 0) return;
  blocks.push({ type: "paragraph", text: buffer.join(" ") });
}
