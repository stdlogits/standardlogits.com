#!/usr/bin/env node
// Draws the site's images into public/: the social card (card.png, from scripts/site/card.html and
// src/lib/standard.json) and the icons made from the mark (public/favicon.svg): favicon.ico,
// apple-touch-icon.png and icon-512.png (the organisation's logo in the JSON-LD). Rerun it when the
// mark, the card or standard.json changes.
//
//   npm run images

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(fileURLToPath(import.meta.url), "../../..");
const at = (path) => resolve(root, path);

/** An .ico holding PNGs, one entry per size. */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((png) => png.data)]);
}

const standard = JSON.parse(await readFile(at("src/lib/standard.json"), "utf8"));
const browser = await chromium.launch();
try {
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2, colorScheme: "light" });
  await card.goto(pathToFileURL(at("scripts/site/card.html")).href);
  await card.evaluate((data) => window.draw(data), standard);
  await card.evaluate(() => document.fonts.ready);
  await writeFile(at("public/card.png"), await card.screenshot({ type: "png" }));

  // The mark in light colours: as drawn (rounded, on transparency) or full bleed, where a platform
  // rounds or masks it itself (iOS).
  const mark = await readFile(at("public/favicon.svg"), "utf8");
  const icon = await browser.newPage({ colorScheme: "light" });
  async function draw(size, bleed) {
    await icon.setViewportSize({ width: size, height: size });
    await icon.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${mark}`);
    if (bleed) await icon.evaluate(() => document.querySelector(".tile").setAttribute("rx", "0"));
    return icon.screenshot({ type: "png", omitBackground: true });
  }
  await writeFile(at("public/apple-touch-icon.png"), await draw(180, true));
  await writeFile(at("public/icon-512.png"), await draw(512, false));
  const small = [];
  for (const size of [16, 32, 48]) small.push({ size, data: await draw(size, false) });
  await writeFile(at("public/favicon.ico"), ico(small));
} finally {
  await browser.close();
}
