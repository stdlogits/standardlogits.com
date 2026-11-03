# AGENTS.md

## What this is

The source of [standardlogits.com](https://standardlogits.com), the site of Standard Logits: one page
with the name as a language model reads it, the work (Neuron Lens and Drowse) and the people. A static
site (Vite 8, Svelte 5 runes, TypeScript; no SvelteKit, no server code), prerendered to HTML at build
time and hydrated in the browser.

## Layout

- `src/main.ts`: hydrates the prerendered page (or, on the dev server's empty shell, mounts it).
  `src/server.ts`: the server build's entry, which the prerender uses.
- `src/App.svelte`: the shell (header, footer, the page or the missing page) and the head's title and
  canonical link. `src/Hero.svelte`, `src/Work.svelte`, `src/People.svelte`: the page's three parts;
  `src/Part.svelte`: a part's title beside its body.
- `src/lib/standard.json`: the hero's numbers (below). `src/lib/odds.ts`: how they are written.
  `src/lib/theme.ts`: the theme, from Ledger's `createTheme`.
- `public/`: copied into the build as is. `_headers` (CSP, security headers, caching), `robots.txt`,
  `sitemap.xml`, `llms.txt`, the mark (`favicon.svg`) and the images drawn from it and the card.
  `vite.config.ts` serves Ledger's `theme-preflight.js` beside them (it applies the stored theme before
  first paint; a file, not inline, because the CSP allows no inline script); `index.html` gives it the
  theme's key.
- `scripts/site/`: `standard.py` (the numbers), `prerender.mjs` (the build's last step),
  `render.mjs` and `card.html` (the images). `scripts/deploy.sh`, `scripts/verify-deployment.mjs`:
  deploy and the live check. `scripts/deploy-mail.sh`: deploys the catch-all's Email Worker.
- `mail/`: that Worker (`worker.js`) and its Wrangler config (below, "Mail").

## Design

The site is drawn in Ledger, the design language of every Standard Logits product, which lives in
[`stdlogits/ledger`](https://github.com/stdlogits/ledger): the package `@stdlogits/ledger`, pinned in
`package.json` to a tag. Its `DESIGN.md` (`node_modules/@stdlogits/ledger/DESIGN.md` at the pinned
version) is the design, and its tokens, faces, motion, tip, theme and pieces are the only ones the site
uses. A change to Ledger lands in that repository first, as a new tag, and reaches the site as a pin
bump; never copy a piece into the site to change it. This repository's `DESIGN.md` lists what the site
draws for itself.

Follow Ledger exactly: flat and borderless, the depth tint as the one accent and only as fill, Wix
Madefor only with tabular numbers, motion on one curve, show rather than tell. Phone widths down to
320 px must not scroll sideways.

The dev server serves Ledger as source rather than pre-bundling it (`optimizeDeps.exclude`), because
vite-plugin-svelte's pre-bundling hands its `.svelte.ts` modules to Svelte with their types still in;
the server build compiles it too (`ssr.noExternal`) rather than leaving `.svelte` files to Node.

## The numbers

The hero shows what Qwen3-8B-Base expects after "Standard": its five likeliest next tokens, then
" Log", our name's first token, with its rank, then "its"; its intro also runs through a sample of the
tokens ranked between (32 ranks spaced on a log scale, keeping tokens the title's face can set on one
line). Every token and number comes from
`src/lib/standard.json`, which `scripts/site/standard.py` writes (`python scripts/site/standard.py`;
it needs torch, transformers and the model, from the shared `~/.venv`). It runs the model in float32:
in bfloat16 the logits near 27 round to steps of 0.125, which ties tokens that differ and moves the
small probabilities between devices. Rerun it only when the model or the prompt changes, commit its
output, and redraw the images (`npm run images`). The page writes nothing about the model that the
file doesn't hold, and the head and `llms.txt` say "far down the list" rather than a rank, so they
don't drift from it.

## The build

`npm run build` builds the client into `dist`, builds `src/server.ts` for Node into `.ssr`, and
`scripts/site/prerender.mjs` renders the page into `dist/index.html` (at `<!--ssr-head-->` and
`<!--ssr-body-->`) and the missing page into `dist/404.html`, which Pages serves with a 404 for any
path without a file. Hydration needs the prerendered markup and the browser's first render to agree,
so nothing rendered may depend on the time or the browser: the footer's year is fixed at build time
(`__YEAR__` in `vite.config.ts`), and the theme and the hero's intro start in `onMount`.

## What the site says about itself

`index.html` holds the head: the description, Open Graph and Twitter tags, icons and JSON-LD (the
organisation, its two members, the site). a9lim is `https://a9l.im/#person`, as on neuron-lens.com;
treetown is `https://standardlogits.com/#treetown`, and the organisation
`https://standardlogits.com/#organization`. The prerender strips the description, link previews and
JSON-LD from the missing page and marks it `noindex`. `robots.txt` welcomes every crawler.

## People

Each person in `src/People.svelte` has a handle (linked to their X account), a role and a site. A
profile picture goes under `src/assets/` and into the entry's `picture` (imported, so Vite hashes it);
without one the page draws a disc with the name's first letter.

## Testing

CI (`.github/workflows/ci.yml`) runs `npm ci`, `check` and `build` on every push to `main` and every
pull request to it. It never deploys.

`scripts/verify-deployment.mjs` checks a served site against `public/_headers` and the build: the
page and the missing page, every file the site serves about itself, and a Chromium smoke that the
page hydrates under the CSP and that choosing a token changes the title. Before a first deploy it can
run against Wrangler's local Pages server, which applies `_headers` and `404.html` as Pages does:

```bash
npm run build
./node_modules/.bin/wrangler pages dev dist --port 8788
node scripts/verify-deployment.mjs http://127.0.0.1:8788 --build dist
```

## Deploy

`scripts/deploy.sh` (`npm run deploy`) deploys to the Cloudflare Pages project `standardlogits` in
a9's own Cloudflare account, production branch `main`, then verifies `https://standardlogits.com`. The
Cloudflare user logged in on this machine also reaches the account that hosts drowse.ai, so the script
pins every Wrangler call to `CLOUDFLARE_ACCOUNT_ID`, which it requires (from the environment or
`~/.config/cloudflare/standardlogits.env`, outside the repo). Never run a Wrangler command for this
site without that account ID. The Pages project and the custom domain must exist in that account
first. Keep Rocket Loader and email obfuscation off: they add inline scripts the CSP blocks.

## Mail

The domain's mail goes through Cloudflare Email Routing in the same account. A named address forwards
to one of us (`a9lim@` to mx@a9l.im, `luna@` to hi@logits.ml); every other address meets the
catch-all, which hands the message to the Email Worker `standardlogits-mail` (`mail/worker.js`), since
a routing rule forwards to only one address and holds only one action. The Worker forwards it to
both. Both destinations must stay verified in the account, or forwarding to them fails.
`npm run deploy:mail` deploys the Worker, pinned to the account as the site's deploy is; it has no
workers.dev or preview URL. The rules live in the account, not here. `wrangler email routing rules
update` refuses a Worker on the catch-all, but the API takes it (PUT
`/zones/{zone}/email/routing/rules/catch_all`, action `{"type": "worker", "value":
["standardlogits-mail"]}`).
