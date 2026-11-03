# standardlogits.com

The source of [standardlogits.com](https://standardlogits.com): Standard Logits, who we are and what
we make. One page: the name as a language model reads it (after "Standard", Qwen3-8B-Base expects
"ization" or "ized"; our " Log" comes far down the list), then the work, Neuron Lens and Drowse, and
the people.

## Run it

Node 24 or newer.

```bash
npm ci
npm run dev          # http://localhost:5190
npm run check        # svelte-check
npm run build        # dist/, the page prerendered into it
npm run preview      # the built site, http://localhost:5191
```

A static site: Vite, Svelte 5 and TypeScript, prerendered to HTML at build time and hydrated in the
browser, with no server code. It is drawn in Ledger ([`stdlogits/ledger`](https://github.com/stdlogits/ledger)).

## The numbers

Every number in the title's list is computed: `scripts/site/standard.py` runs Qwen3-8B-Base on
"Standard" and writes `src/lib/standard.json`, which the page and the social card read. It needs
torch, transformers and the model; rerun it only when the model or the prompt changes, then
`npm run images` to redraw the card.

## Deploy

`scripts/deploy.sh` builds from a clean, pushed `main`, uploads `dist` to Cloudflare Pages with
Wrangler, and checks the live site with `scripts/verify-deployment.mjs`. It needs
`CLOUDFLARE_ACCOUNT_ID` (in the environment or `~/.config/cloudflare/standardlogits.env`); `--dry-run`
stops before the upload.

Mail to any address at standardlogits.com without its own routing rule reaches both of us through an
Email Worker (`mail/worker.js`), which `npm run deploy:mail` deploys with the same account.

## Credits

By a9lim, treetown and Claude. The design is Ledger, whose Wix Madefor faces are under the SIL Open
Font License.

## License

[AGPL-3.0](LICENSE).
