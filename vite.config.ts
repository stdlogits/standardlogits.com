import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

/** Ledger's pre-paint theme script, served from the site's own origin at /theme-preflight.js (the CSP
 * allows no inline script) and written into the build as it is. index.html names the theme's key. */
function themePreflight(): Plugin {
  const PATH = "theme-preflight.js";
  const source = () => readFileSync(createRequire(import.meta.url).resolve(`@stdlogits/ledger/${PATH}`));
  return {
    name: "theme-preflight",
    configureServer(server) {
      server.middlewares.use(`/${PATH}`, (_request, response) => {
        response.setHeader("Content-Type", "text/javascript");
        response.end(source());
      });
    },
    generateBundle() {
      if (!this.environment.config.build.ssr) this.emitFile({ type: "asset", fileName: PATH, source: source() });
    },
  };
}

// One page, prerendered: `npm run build` builds the client into dist, builds src/server.ts for Node
// into .ssr, and scripts/site/prerender.mjs renders the page into dist/index.html (and 404.html),
// which main.ts then hydrates.
export default defineConfig({
  plugins: [svelte(), themePreflight()],
  // Ledger ships .svelte.ts modules, which vite-plugin-svelte's dependency pre-bundling (7.0 to 7.3)
  // hands to Svelte with their types still in. The dev server serves it as source instead, and the
  // server build compiles it rather than leaving it to Node.
  optimizeDeps: { exclude: ["@stdlogits/ledger"] },
  ssr: { noExternal: ["@stdlogits/ledger"] },
  // The footer's year, fixed at build time so the prerendered page and the hydrated one agree.
  define: { __YEAR__: JSON.stringify(new Date().getFullYear()) },
  build: { target: "es2022", assetsInlineLimit: 0 },
  server: { port: 5190 },
  preview: { port: 5191 },
});
