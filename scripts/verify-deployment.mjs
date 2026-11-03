#!/usr/bin/env node
// Checks a deployed standardlogits.com: the page, the missing page and every file the site serves
// answer as Cloudflare Pages should serve this build, with the headers public/_headers sets, and the
// prerendered page hydrates under that CSP (the dev server sends no CSP, so only a deployed site can
// fail that way).
//
//   node scripts/verify-deployment.mjs [origin]      default https://standardlogits.com
//     --build dist     wait (up to five minutes) for the live page to be this local build, then also
//                      require every file to match it byte for byte (scripts/deploy.sh passes it)
//     --http-only      skip the browser smoke

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");

// ---------- _headers, as Cloudflare Pages applies it

/** Parses public/_headers into rules: { path, set: [name, value][], unset: name[] }. */
function parseHeadersFile(text) {
  const rules = [];
  let rule = null;
  for (const [number, raw] of text.split("\n").entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("/")) {
      rule = { path: line, set: [], unset: [] };
      rules.push(rule);
      continue;
    }
    assert.ok(rule, `_headers line ${number + 1}: a header before any path`);
    if (line.startsWith("! ")) {
      rule.unset.push(line.slice(2).trim().toLowerCase());
      continue;
    }
    const colon = line.indexOf(":");
    assert.ok(colon > 0, `_headers line ${number + 1}: expected "Name: value"`);
    rule.set.push([line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

/** The headers _headers gives a path: each matching rule in order removes its "! Name" headers, then
 * sets its own, joining with a comma any that an earlier rule set and didn't remove. */
function headersFor(rules, pathname) {
  const out = new Map();
  for (const rule of rules) {
    const pattern = new RegExp(`^${rule.path.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    if (!pattern.test(pathname)) continue;
    for (const name of rule.unset) out.delete(name);
    for (const [name, value] of rule.set) out.set(name, out.has(name) ? `${out.get(name)}, ${value}` : value);
  }
  return out;
}

function assertHeaders(response, rules, pathname) {
  for (const [name, expected] of headersFor(rules, pathname)) {
    const actual = response.headers.get(name);
    assert.ok(actual !== null, `${pathname}: no ${name} header`);
    assert.equal(actual, expected, `${pathname}: ${name}`);
  }
}

// ---------- HTTP checks

const mime = (response) => (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
const get = (origin, path) => fetch(new URL(path, origin), { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(30_000) });
const assetRefs = (html) => [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]).sort();

// What the site serves about itself: the mark and the card (scripts/site/render.mjs) and the files in
// public/ that describe it.
const SITE_FILES = [
  ["/favicon.svg", ["image/svg+xml"]],
  ["/favicon.ico", ["image/x-icon", "image/vnd.microsoft.icon"]],
  ["/apple-touch-icon.png", ["image/png"]],
  ["/icon-512.png", ["image/png"]],
  ["/card.png", ["image/png"]],
  ["/llms.txt", ["text/plain", "text/markdown"]],
  ["/robots.txt", ["text/plain"]],
  ["/sitemap.xml", ["application/xml", "text/xml"]],
  ["/theme-preflight.js", ["text/javascript", "application/javascript"]],
];

/** Polls / until it references the same assets as the local build: Pages takes a little while. */
async function waitForBuild(origin, buildDir) {
  const want = assetRefs(await readFile(resolve(buildDir, "index.html"), "utf8"));
  for (let tries = 0; ; tries += 1) {
    const response = await get(origin, "/").catch(() => null);
    const got = response?.ok ? assetRefs(await response.text()) : [];
    if (got.join() === want.join()) return;
    if (tries >= 30) assert.fail(`after five minutes ${origin}/ still serves another build than ${buildDir}`);
    await new Promise((done) => setTimeout(done, 10_000));
  }
}

async function checkPages(origin, rules, buildDir) {
  const response = await get(origin, "/");
  assert.equal(response.status, 200, `/: HTTP ${response.status}`);
  assert.equal(mime(response), "text/html", `/: ${mime(response)}`);
  assertHeaders(response, rules, "/");
  const html = await response.text();
  // Prerendered: the page is in the HTML, not only drawn by script.
  assert.match(html, /<h1[^>]*>Standard /, "/ has no prerendered title");
  assert.ok(html.includes("@treetowntree") && html.includes("@_a9lim"), "/ has no prerendered people");
  // The CSP allows no inline script, so anything the zone injects (Rocket Loader, email obfuscation)
  // would be blocked. The JSON-LD is a data block, which never runs.
  const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc=)(?![^>]*\btype="application\/ld\+json")[^>]*>/gi)];
  assert.equal(inline.length, 0, `/ has ${inline.length} inline script(s), which the CSP blocks`);
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(ld, "/ has no JSON-LD");
  JSON.parse(ld);
  if (buildDir) assert.equal(html, await readFile(resolve(buildDir, "index.html"), "utf8"), `/ differs from ${buildDir}/index.html`);

  const path = `/no-such-page-${crypto.randomUUID().slice(0, 8)}`;
  const missing = await get(origin, path);
  assert.equal(missing.status, 404, `${path}: HTTP ${missing.status}, expected 404 (dist/404.html)`);
  const body = await missing.text();
  assert.ok(body.includes("data-missing") && body.includes('name="robots" content="noindex"'), `${path} is not the missing page`);

  for (const ref of assetRefs(html).filter((ref) => /\.(js|css)$/.test(ref))) {
    const asset = await get(origin, ref);
    assert.equal(asset.status, 200, `${ref}: HTTP ${asset.status}`);
    assert.match(asset.headers.get("cache-control") ?? "", /\bimmutable\b/, `${ref}: not immutable`);
    await asset.body?.cancel();
  }
}

async function checkFiles(origin, rules, buildDir) {
  for (const [path, types] of SITE_FILES) {
    const response = await get(origin, path);
    assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
    assert.ok(types.includes(mime(response)), `${path}: ${mime(response)}`);
    assertHeaders(response, rules, path);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (buildDir) assert.ok(bytes.equals(await readFile(resolve(buildDir, path.slice(1)))), `${path} differs from ${buildDir}`);
    else assert.ok(bytes.length > 0, `${path} is empty`);
  }
}

// ---------- Browser smoke: the page hydrates under the CSP, the intro runs down the list and lands on
// ·Log, and choosing a token changes the title

async function browserSmoke(origin) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const problems = [];
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const w = /** @type {any} */ (window);
      w.__csp = [];
      document.addEventListener("securitypolicyviolation", (event) => w.__csp.push(`${event.effectiveDirective} blocked ${event.blockedURI || "inline"}`));
    });
    page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error") problems.push(`console: ${message.text()}`); });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    const slot = page.locator("h1 .slot .morph-source");
    assert.equal(await slot.textContent(), "Log", "the title's slot doesn't hold ·Log");
    // The slot (and the skipped line, when given) holding these texts.
    const holds = ([text, skip]) => document.querySelector("h1 .slot .morph-source")?.textContent === text && (skip === undefined || document.querySelector(".dist .skip .morph-source")?.textContent === skip);
    const standard = JSON.parse(await readFile(resolve(root, "src/lib/standard.json"), "utf8"));
    const skipped = `${(standard.name.pieces[0].rank - standard.top.length - 1).toLocaleString("en-US")} more`;
    await page.waitForFunction(holds, [standard.top[0].token.trim()], { timeout: 8000 }).catch(() => problems.push("the intro didn't start: the page didn't hydrate"));
    await page.waitForFunction(holds, ["Log", skipped], { timeout: 10000 }).catch(() => problems.push("the intro didn't land on ·Log"));
    await page.getByRole("button", { name: /deviation/ }).click();
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => document.querySelector("h1 .slot .morph-source")?.textContent === "deviation", null, { timeout: 5000 }).catch(() => problems.push("choosing ·deviation didn't change the title: the page didn't hydrate"));
    problems.push(...(await page.evaluate(() => /** @type {any} */ (window).__csp)).map((line) => `CSP: ${line}`));
  } finally {
    await browser.close();
  }
  assert.deepEqual(problems, [], `the browser smoke found problems:\n  ${problems.join("\n  ")}`);
}

// ---------- main

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const buildIndex = args.indexOf("--build");
const buildDir = buildIndex >= 0 ? resolve(root, args[buildIndex + 1]) : null;
const origin = (args.find((arg, i) => !arg.startsWith("--") && args[i - 1] !== "--build") ?? "https://standardlogits.com").replace(/\/$/, "");
const rules = parseHeadersFile(await readFile(resolve(root, "public/_headers"), "utf8"));

if (buildDir) await waitForBuild(origin, buildDir);
await checkPages(origin, rules, buildDir);
await checkFiles(origin, rules, buildDir);
if (!flag("--http-only")) await browserSmoke(origin);
console.log(`verify: ${origin} serves ${buildDir ? "this build" : "the site"} as it should`);
