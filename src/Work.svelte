<script lang="ts">
  import { Context, Token } from "@stdlogits/ledger";
  import Part from "./Part.svelte";

  // What we make, each shown by what it shows. Neuron Lens by one unit as its explorer has it: L8 n344
  // in Qwen3-8B, a firing and what it writes, tinted at layer 8's place on the depth ramp (of 36), as
  // on neuron-lens.com's card. Drowse by what it does.
  const OWL = "color-mix(in oklch, var(--deep) 77%, var(--late))";
  const OWL_WRITES = [" owl", " noct", " night", " bedtime"];
  const DROWSE = ["Steering", "Probes", "Manifolds", "R lens", "WebGPU"];
</script>

<Part id="work" title="Work">
  <div class="units">
    <article class="unit" style:--tint={OWL}>
      <h3><span class="mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path class="fill" d="M16 6A11.333 11.333 0 0 1 16 26A11.333 11.333 0 0 1 16 6Z" /></svg></span>Neuron Lens</h3>
      <p class="meta">L8 n344 in Qwen3-8B fires on</p>
      <Context context={["hear the sound of the ⟦owl⟧s"]} />
      <p class="meta">and pushes the model to say</p>
      <p class="toks">{#each OWL_WRITES as token, i (token)}<Token {token} flags={i === 0 ? 1 : 0} {i} />{/each}</p>
      <p class="figures"><span><b>1,179,648</b> neurons</span><span><b>1,920</b> heads</span></p>
      <a class="prose-link" href="https://neuron-lens.com/qwen3-8b/L8/n344" rel="external noreferrer">Open neuron-lens.com</a>
    </article>
    <article class="unit">
      <h3><span class="mark" aria-hidden="true"><svg viewBox="0 0 64 64"><path class="line" d="M15 27c4.5 8 10.5 12 17 12s12.5-4 17-12M21.5 34.5l-3 4.5M32 39v5.5M42.5 34.5l3 4.5" /></svg></span>Drowse</h3>
      <p class="meta">An interpretability workbench, running in your browser</p>
      <p class="toks">{#each DROWSE as token, i (token)}<Token {token} {i} />{/each}</p>
      <p class="figures"><span><b>0</b> prompts leave your device</span></p>
      <a class="prose-link" href="https://drowse.ai" rel="external noreferrer">Open drowse.ai</a>
    </article>
  </div>
</Part>

<style>
  .units { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s7); }
  .unit { display: grid; align-content: start; gap: var(--s3); min-width: 0; }
  h3 { display: flex; align-items: center; gap: var(--s3); font: var(--type-heading); letter-spacing: -0.02em; }
  /* Each product's mark at 28 px, as its favicon draws it: a tile of the depth ramp with a figure in the
   * paper's colour, Neuron Lens's lens filled and Drowse's closed eye stroked. */
  .mark { display: grid; flex: none; width: 28px; height: 28px; border-radius: 25%; background: linear-gradient(to right, var(--deep), var(--late)); background: linear-gradient(to right in oklch, var(--deep), var(--late)); }
  .mark svg { width: 100%; height: 100%; }
  .fill { fill: var(--paper); }
  .line { fill: none; stroke: var(--paper); stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; }
  .figures { display: flex; flex-wrap: wrap; gap: var(--s1) var(--s5); color: var(--ink3); font: var(--type-small); }
  .figures b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
  .prose-link { justify-self: start; font: var(--type-control); }
  @media (max-width: 900px) { .units { grid-template-columns: minmax(0, 1fr); } }
</style>
