# Design

The site is drawn in Ledger, the design language of Standard Logits, which lives in
[`stdlogits/ledger`](https://github.com/stdlogits/ledger) as the package `@stdlogits/ledger` (pinned in
`package.json`). Its [`DESIGN.md`](https://github.com/stdlogits/ledger/blob/main/DESIGN.md) is the
design: principles, tokens, type, motion and pieces. The copy at the pinned version is
`node_modules/@stdlogits/ledger/DESIGN.md`. A change to Ledger lands there first and reaches this site
as a pin bump.

What the site draws for itself, in Ledger:

- **The hero** (`src/Hero.svelte`). The title is the name with its slot: the token the list below is
  about, marked as a unit's firing is (the tint at 22%, grown by its own shadow), ·Log with "its"
  after it to begin with. The list is Qwen3-8B-Base's likeliest next tokens after "Standard", then
  ·Log far down: Ledger's tokens, flat bars in the tint as wide as each probability against the
  likeliest, and the number in `meta`. Pointing at a row puts its token in the slot (letters morph,
  `MorphText`); choosing one keeps it there, with the wash thumb gliding to its row. The slot's tip
  says what the model gave it and names the model. No sentence explains it.
- **The work** (`src/Work.svelte`). Each product shown by what it shows: Neuron Lens by one unit, L8
  n344 in Qwen3-8B, tinted at layer 8's place on the depth ramp, as on neuron-lens.com's card; Drowse
  by what it does. Each carries its own mark, as its favicon draws it: Neuron Lens's lens and
  Drowse's closed eye, each in the paper's colour on the ramp tile.
- **The people** (`src/People.svelte`). A handle linked to its X account, a role, a site. Profile
  pictures go in each entry's `picture`: treetown's and a9lim's own, and for Claude the Claude mark
  in white on its orange (`src/assets/claude.svg`, from Simple Icons). Without one a `wash2` disc
  holds the name's first letter. Claude is listed as a contributor.
- **The mark** (`public/favicon.svg`): the logit curve cut from the depth ramp, logit(p) for p from
  1% to 99% stroked in the paper's colour on the ramp tile, a sibling of Neuron Lens's lens and
  Drowse's eye. Ledger's DESIGN.md describes it, with the tile every mark shares, under "The marks and
  the cards".
- **The card** (`scripts/site/card.html`, drawn by `scripts/site/render.mjs` into `public/card.png`):
  the mark, then the hero as the page shows it. No sentences.
- **The header and footer** (`src/App.svelte`): the name, Work, People and the theme button above;
  GitHub, Hugging Face and the two products as text links below. Ledger has no brand icons, so links
  to other services stay words.
