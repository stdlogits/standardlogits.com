<script lang="ts">
  import { MorphText, Token, glide } from "@stdlogits/ledger";
  import standard from "./lib/standard.json";
  import { count, oneIn, percent } from "./lib/odds";

  // The name as a model reads it. After "Standard", Qwen3-8B-Base's likeliest next tokens, then our
  // name's first token, " Log", far down the list. The title's slot holds whichever one is chosen or
  // pointed at (·Log, with "its" after it, to begin with) and morphs between them; its tip says what
  // the model gave it. Every number comes from src/lib/standard.json (scripts/site/standard.py).
  interface Choice { token: string; p: number; rank: number; tail: string; word: string; say: string }

  const MODEL = standard.model.split("/").pop() ?? standard.model;
  const max = Math.max(...standard.top.map((c) => c.p));
  const top: Choice[] = standard.top.map((c) => ({ ...c, tail: "", word: standard.prompt + c.token, say: `${percent(c.p)}, rank ${count(c.rank)}` }));
  const [log, its] = standard.name.pieces;
  const name: Choice = {
    ...log,
    tail: its.token,
    word: standard.prompt + log.token + its.token,
    say: `·${log.token.trim()} ${percent(log.p)} at rank ${count(log.rank)}, then ${its.token} ${percent(its.p)} at rank ${count(its.rank)}: about 1 in ${oneIn(standard.name.p)}`,
  };
  const skipped = name.rank - top.length - 1;

  let chosen = $state.raw(name);
  let pointed = $state.raw<Choice | null>(null);
  const shown = $derived(pointed ?? chosen);

  function leave(event: FocusEvent) {
    const into = event.relatedTarget;
    if (!(into instanceof Node) || !(event.currentTarget as HTMLElement).contains(into)) pointed = null;
  }
</script>

{#snippet row(c: Choice, i: number)}
  <button type="button" class="row" aria-pressed={c === chosen} style:--i={i} onclick={() => (chosen = c)} onpointerenter={() => (pointed = c)} onfocus={() => (pointed = c)}>
    <Token token={c.token} />
    <span class="bar" aria-hidden="true"><i style:--w={c.p / max}></i></span>
    <span class="pct">{c === name ? `rank ${count(c.rank)} · ` : ""}<b>{percent(c.p)}</b></span>
  </button>
{/snippet}

<header class="hero">
  <h1 class="title rise">{standard.prompt}{shown.token.startsWith(" ") ? " " : ""}<button type="button" class="slot" data-tip-title={shown.word} data-tip={shown.say} data-tip-sub={MODEL}><MorphText text={shown.token.trim()} numbers={false} /></button><MorphText text={shown.tail} numbers={false} /></h1>
  <div class="dist rise" style:--i={1} role="group" aria-label="What {MODEL} expects after “{standard.prompt}”. Choose one to put it in the title." use:glide onpointerleave={() => (pointed = null)} onfocusout={leave}>
    {#each top as c, i (c.token)}{@render row(c, i)}{/each}
    <p class="skip" aria-hidden="true">⋮ {count(skipped)} more</p>
    {@render row(name, top.length + 1)}
  </div>
  <p class="lead rise" style:--i={2}>Standard Logits studies what happens inside language models.</p>
</header>

<style>
  .hero { display: grid; justify-items: start; gap: var(--s6); min-width: 0; }
  .title { font: var(--type-title); letter-spacing: -0.04em; overflow-wrap: anywhere; }
  /* The slot: the token the list is about, marked as a unit's firing is, grown by its own shadow. A
   * button, as a token with a tip is, so a keyboard can reach what the model gave it. */
  .slot { display: inline; padding: 0; border: 0; border-radius: var(--r-col); background: color-mix(in oklch, var(--tint) 22%, transparent); box-shadow: 0 0 0 4px color-mix(in oklch, var(--tint) 22%, transparent); color: var(--ink); font: inherit; letter-spacing: inherit; cursor: help; }
  /* The rows share one grid (subgrid), so every bar has the same track and the numbers size the last
   * column. */
  .dist { --glide-bg: var(--wash); --glide-radius: var(--r-box); display: grid; grid-template-columns: minmax(0, 132px) minmax(0, 1fr) auto; gap: 2px var(--s4); width: min(calc(100% + var(--s3) * 2), 624px); margin-inline: calc(var(--s3) * -1); }
  .row { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: center; width: 100%; padding: var(--s2) var(--s3); border: 0; border-radius: var(--r-box); background: transparent; color: var(--ink); font: var(--type-small); text-align: start; cursor: pointer; transition: background-color var(--fast) var(--ease), scale var(--fast) var(--ease); }
  .row:active { scale: 0.99; }
  .row > :global(.tok) { justify-self: start; }
  .row[aria-pressed="true"] > :global(.tok) { background: var(--wash2); }
  @media (hover: hover) {
    .row:not([aria-pressed="true"]):hover { background: color-mix(in oklch, var(--wash) 60%, transparent); }
    .row:hover > :global(.tok) { background: var(--wash2); }
  }
  /* Flat bars in the accent on a wash, as wide as each token's probability against the likeliest. */
  .bar { position: relative; height: 4px; border-radius: 2px; background: var(--wash); }
  .bar i { position: absolute; inset: 0 auto 0 0; width: max(2px, calc(var(--w) * 100%)); border-radius: 2px; background: var(--tint); transform-origin: left; animation: fill var(--glide) var(--ease) backwards; animation-delay: calc(80ms + var(--i, 0) * 24ms); }
  @keyframes fill { from { transform: scaleX(0); } }
  .pct { color: var(--ink3); font: var(--type-meta); font-variant-numeric: tabular-nums; text-align: end; white-space: nowrap; }
  .pct b { color: var(--ink); font-weight: 600; }
  .skip { grid-column: 1 / -1; padding: var(--s1) var(--s3); color: var(--ink3); font: var(--type-meta); }
  .lead { max-width: 52ch; color: var(--ink2); font: var(--type-lead); text-wrap: pretty; }
  @media (max-width: 520px) { .dist { grid-template-columns: max-content minmax(0, 1fr) auto; column-gap: var(--s3); } }
  @media (prefers-reduced-motion: reduce) { .bar i { animation: none; } }
</style>
