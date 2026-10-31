<script lang="ts">
  import type { Snippet } from "svelte";

  // One part of the page: its title on the left, staying in view while the part scrolls past on wide
  // screens, and what it is about on the right. Stacked on narrow screens.
  let { id, title, children }: { id: string; title: string; children: Snippet } = $props();
</script>

<section class="part" {id} aria-labelledby="{id}-title">
  <h2 id="{id}-title">{title}</h2>
  <div class="body">{@render children()}</div>
</section>

<style>
  .part { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: var(--s5) var(--s7); align-items: start; min-width: 0; scroll-margin-top: var(--s5); }
  h2 { position: sticky; top: var(--s5); font: var(--type-heading); letter-spacing: -0.02em; }
  .body { min-width: 0; }
  @media (max-width: 900px) { .part { grid-template-columns: minmax(0, 1fr); } h2 { position: static; } }
</style>
