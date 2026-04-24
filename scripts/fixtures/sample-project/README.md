# quill

A tiny markdown-to-HTML converter. Used as sample project data for the dy-mcp demo.

## Install

```bash
npm install quill-md
```

## Usage

```js
import { render } from "quill-md";

const html = render("# Hello\n\nThis is *quill*.");
```

## Development

```bash
npm test
npm run build
```
