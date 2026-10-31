#!/usr/bin/env node
// The last step of `npm run build`: render the page once, with the server build of src/server.ts in
// .ssr, into dist/index.html, where main.ts hydrates it; and the missing page into dist/404.html,
// which Cloudflare Pages serves, with a 404, for any path without a file. Crawlers, link previews and
// readers without script get the whole page as HTML.

import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../../..");
const at = (path) => resolve(root, path);

const { render, App } = await import(pathToFileURL(at(".ssr/server.js")).href);
const shell = await readFile(at("dist/index.html"), "utf8");
if (!shell.includes("<!--ssr-head-->") || !shell.includes("<!--ssr-body-->")) throw new Error("dist/index.html lost its <!--ssr-head--> or <!--ssr-body--> mark");

function page(html, props) {
  const { head, body } = render(App, { props });
  return html.replace("<!--ssr-head-->", () => head).replace("<!--ssr-body-->", () => body);
}

await writeFile(at("dist/index.html"), page(shell, { missing: false }));
// The missing page says nothing about the site beyond its name: no description of it, no link
// previews, no structured data, and main.ts hydrates it as missing.
const missing = shell
  .replace(/\s*<meta (name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, "")
  .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, "")
  .replace('<div id="app">', '<div id="app" data-missing>');
await writeFile(at("dist/404.html"), page(missing, { missing: true }));
await rm(at(".ssr"), { recursive: true, force: true });
console.log("prerendered dist/index.html and dist/404.html");
