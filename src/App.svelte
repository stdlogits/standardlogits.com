<script lang="ts">
  import { onMount } from "svelte";
  import { ThemeButton, tips } from "@stdlogits/ledger";
  import Hero from "./Hero.svelte";
  import Work from "./Work.svelte";
  import People from "./People.svelte";
  import { theme } from "./lib/theme";

  // The whole site: one page (or, as 404.html, the missing page), between the header and the footer.
  let { missing = false }: { missing?: boolean } = $props();
  onMount(() => theme.start());
</script>

<svelte:head>
  {#if missing}
    <title>Not found · Standard Logits</title>
    <meta name="robots" content="noindex" />
  {:else}
    <title>Standard Logits</title>
    <link rel="canonical" href="https://standardlogits.com/" />
  {/if}
</svelte:head>

<a class="skip" href="#main">Skip to content</a>
<div class="site" use:tips>
  <header class="bar">
    <a class="name" href="/">Standard Logits</a>
    <nav aria-label="Site">
      <a href="/#work">Work</a>
      <a href="/#people">People</a>
      <ThemeButton {theme} />
    </nav>
  </header>

  <main id="main" tabindex="-1">
    {#if missing}
      <section class="missing">
        <h1 class="rise">Not found</h1>
        <p class="rise" style:--i={1}>Nothing lives at this address.</p>
        <a class="go rise" style:--i={2} href="/">Go to Standard Logits</a>
      </section>
    {:else}
      <Hero />
      <Work />
      <People />
    {/if}
  </main>

  <footer class="bar">
    <span>Standard Logits</span>
    <nav aria-label="Elsewhere">
      <a href="https://github.com/stdlogits" rel="external noreferrer">GitHub</a>
      <a href="https://huggingface.co/stdlogits" rel="external noreferrer">Hugging Face</a>
      <a href="https://neuron-lens.com" rel="external noreferrer">Neuron Lens</a>
      <a href="https://drowse.ai" rel="external noreferrer">Drowse</a>
    </nav>
    <span class="year">{__YEAR__}</span>
  </footer>
</div>

<style>
  .site { display: flex; flex-direction: column; min-height: 100svh; }
  .bar { width: 100%; max-width: var(--page); margin: 0 auto; padding-left: max(var(--gutter), env(safe-area-inset-left, 0px)); padding-right: max(var(--gutter), env(safe-area-inset-right, 0px)); }
  header { display: flex; align-items: center; justify-content: space-between; gap: var(--s5); padding-block: var(--s5); }
  .name { color: var(--ink); font: 600 20px/28px var(--display); letter-spacing: -0.02em; white-space: nowrap; }
  nav { display: flex; align-items: center; gap: var(--s5); }
  header nav a { color: var(--ink3); font: var(--type-small); white-space: nowrap; transition: color var(--fast) var(--ease); }
  /* ThemeButton's 36 px wash pads its icon, so it sits a little closer than the links. */
  header nav > :global(.theme) { margin-left: calc(var(--s2) * -1); }

  main { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr); align-content: start; gap: var(--s9); width: 100%; max-width: var(--page); margin: 0 auto; padding: var(--s7) max(var(--gutter), env(safe-area-inset-right, 0px)) var(--s9) max(var(--gutter), env(safe-area-inset-left, 0px)); }
  main:focus { outline: none; }

  .missing { display: grid; justify-items: start; gap: var(--s5); }
  .missing h1 { font: var(--type-title); letter-spacing: -0.04em; }
  .missing p { color: var(--ink2); font: var(--type-lead); }
  .go { display: inline-flex; align-items: center; height: 44px; padding: 0 var(--s5); border-radius: var(--r-pill); background: var(--ink); color: var(--paper); font: var(--type-control); transition: opacity var(--fast) var(--ease), scale var(--fast) var(--ease); }
  .go:active { scale: 0.97; }

  footer { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s2) var(--s5); padding-block: var(--s6) var(--s7); color: var(--ink3); font: var(--type-small); }
  footer nav { flex-wrap: wrap; gap: var(--s4); }
  footer a { transition: color var(--fast) var(--ease); }
  .year { margin-left: auto; font-variant-numeric: tabular-nums; }

  .skip { position: fixed; left: var(--s2); top: var(--s2); z-index: 60; padding: var(--s2) var(--s4); border-radius: var(--r-pill); background: var(--ink); color: var(--paper); font: var(--type-control); transform: translateY(-200%); }
  .skip:focus { transform: none; }

  @media (hover: hover) {
    header nav a:hover, footer a:hover { color: var(--ink); }
    .go:hover { opacity: 0.86; }
  }
  @media (max-width: 900px) { main { gap: var(--s8); } }
  @media (max-width: 720px) { main { padding-top: var(--s5); } }
  @media (max-width: 520px) { nav { gap: var(--s4); } }
  @media (max-width: 400px) { header, header nav { gap: var(--s3); } }
</style>
