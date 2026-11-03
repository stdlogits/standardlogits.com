<script lang="ts">
  import { onMount } from "svelte";
  import { MorphText, Token, glide, reducedMotion } from "@stdlogits/ledger";
  import standard from "./lib/standard.json";
  import { count, oneIn, percent } from "./lib/odds";

  // The name as a model reads it. After "Standard", Qwen3-8B-Base's likeliest next tokens, then our
  // name's first token, " Log", far down the list. The title's slot holds whichever one is chosen or
  // pointed at (·Log, with "its" after it, to begin with) and morphs between them; its tip says what
  // the model gave it, and the lead under it finishes its sentence. Every token and number comes from
  // src/lib/standard.json (scripts/site/standard.py).
  interface Choice { token: string; p: number; rank: number; tail: string; word: string; say: string }
  type Ranked = { token: string; p: number; rank: number };

  const MODEL = standard.model.split("/").pop() ?? standard.model;
  const max = Math.max(...standard.top.map((c) => c.p));
  const choice = (c: Ranked): Choice => ({ ...c, tail: "", word: standard.prompt + c.token, say: `${percent(c.p)}, rank ${count(c.rank)}` });
  const top = standard.top.map(choice);
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

  // The intro. Once the page has settled on ·Log, the slot runs down the list as the model ranks it:
  // the top five one by one, then a sample of the tokens between (spaced evenly on a log scale) ever
  // faster, with the skipped line holding the thumb and the rank, and lands on ·Log again. The run
  // passes over a sampled word the title can't hold on one line here, so it never jumps the page.
  // Pointing at or choosing a row stops it. It starts in onMount, so the prerendered page and the
  // browser's first render agree, and never under reduced motion.
  const HOLD = 1000;
  const FIVE = top.map((c, i): [Choice, number] => [c, 420 - i * 50]);
  let hero: HTMLElement;
  let title: HTMLElement;
  let running = $state(false);
  let timer = 0;

  /** The sampled tokens whose words fit the title's room on one line, each held a little less long. */
  function run(): [Choice, number][] {
    const style = getComputedStyle(title);
    const probe = document.createElement("span");
    Object.assign(probe.style, { position: "absolute", visibility: "hidden", whiteSpace: "nowrap", fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing });
    document.body.append(probe);
    const room = hero.clientWidth - 8;
    const fit = standard.passed.map(choice).filter((c) => {
      probe.textContent = standard.prompt + (c.token.startsWith(" ") ? " " : "") + c.token.trim();
      return probe.getBoundingClientRect().width <= room;
    });
    probe.remove();
    return fit.map((c, i) => [c, 120 * 0.2 ** (i / Math.max(fit.length - 1, 1))]);
  }

  function stop() {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
    running = false;
    chosen = name;
  }

  onMount(() => {
    if (reducedMotion()) return;
    let steps: [Choice, number][] = [];
    let step = -1;
    const next = () => {
      step += 1;
      const [c, hold] = steps[step] ?? [name, 0];
      chosen = c;
      running = step >= FIVE.length && step < steps.length;
      timer = step < steps.length ? window.setTimeout(next, hold) : 0;
    };
    const start = () => {
      timer = window.setTimeout(() => {
        steps = [...FIVE, ...run()];
        next();
      }, HOLD);
    };
    if (document.hidden) document.addEventListener("visibilitychange", start, { once: true });
    else start();
    return () => {
      document.removeEventListener("visibilitychange", start);
      clearTimeout(timer);
    };
  });

  function leave(event: FocusEvent) {
    const into = event.relatedTarget;
    if (!(into instanceof Node) || !(event.currentTarget as HTMLElement).contains(into)) pointed = null;
  }
</script>

{#snippet row(c: Choice, i: number)}
  <button type="button" class="row" aria-pressed={c === chosen} style:--i={i} onclick={() => { stop(); chosen = c; }} onpointerenter={() => { stop(); pointed = c; }} onfocus={() => { stop(); pointed = c; }}>
    <Token token={c.token} />
    <span class="bar" aria-hidden="true"><i style:--w={c.p / max}></i></span>
    <span class="pct">{c === name ? `rank ${count(c.rank)} · ` : ""}<b>{percent(c.p)}</b></span>
  </button>
{/snippet}

<header class="hero" bind:this={hero}>
  <div class="sentence">
    <h1 class="title rise" bind:this={title}>{standard.prompt}{shown.token.startsWith(" ") ? " " : ""}<button type="button" class="slot" data-tip-title={shown.word} data-tip={shown.say} data-tip-sub={MODEL}><MorphText text={shown.token.trim()} numbers={false} /></button><MorphText text={shown.tail} numbers={false} /></h1>
    <p class="lead rise" style:--i={1}>studies what happens inside language models.</p>
  </div>
  <div class="dist rise" style:--i={2} role="group" aria-label="What {MODEL} expects after “{standard.prompt}”. Choose one to put it in the title." use:glide={"[aria-pressed='true'], .skip.on"} onpointerleave={() => (pointed = null)} onfocusout={leave}>
    {#each top as c, i (c.token)}{@render row(c, i)}{/each}
    <p class="skip" class:on={running} aria-hidden="true">⋮ <MorphText text={running ? `rank ${count(chosen.rank)}` : `${count(skipped)} more`} /></p>
    {@render row(name, top.length + 1)}
  </div>
</header>

<style>
  .hero { display: grid; justify-items: start; gap: var(--s6); min-width: 0; }
  /* The title and the lead read as one sentence, whichever token the title holds. */
  .sentence { display: grid; gap: var(--s3); min-width: 0; }
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
