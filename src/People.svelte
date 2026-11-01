<script lang="ts">
  import Part from "./Part.svelte";
  import a9lim from "./assets/a9lim.webp";
  import treetown from "./assets/treetown.webp";

  // Who we are: a handle (linked to its X account where it has one), a role and a site. A profile
  // picture goes in `picture` (a file under src/assets, imported, at three times its 40 px); without
  // one a disc holds the name's first letter.
  interface Person { name: string; href?: string; role: string; site: string; siteHref: string; picture?: string }

  const PEOPLE: Person[] = [
    { name: "@treetowntree", href: "https://x.com/treetowntree", role: "Member of technical staff", site: "logits.ml", siteHref: "https://logits.ml", picture: treetown },
    { name: "@_a9lim", href: "https://x.com/_a9lim", role: "Member of technical staff", site: "a9l.im", siteHref: "https://a9l.im", picture: a9lim },
    { name: "Claude", role: "Contributor", site: "anthropic.com", siteHref: "https://www.anthropic.com" },
  ];

  const initial = (name: string) => name.replace(/^@_?/, "").charAt(0).toLowerCase();
</script>

<Part id="people" title="People">
  <ul class="people">
    {#each PEOPLE as person (person.name)}
      <li>
        {#if person.picture}<img class="face" src={person.picture} alt="" width="40" height="40" />{:else}<span class="face" aria-hidden="true">{initial(person.name)}</span>{/if}
        <span class="who">
          {#if person.href}<a class="name" href={person.href} rel="external noreferrer">{person.name}</a>{:else}<span class="name">{person.name}</span>{/if}
          <span class="role">{person.role}</span>
        </span>
        <a class="site" href={person.siteHref} rel="external noreferrer">{person.site}</a>
      </li>
    {/each}
  </ul>
</Part>

<style>
  .people { display: grid; gap: var(--s4); }
  li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--s4); align-items: center; }
  .face { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--wash2); color: var(--ink3); font: 600 17px/1 var(--display); object-fit: cover; }
  .who { display: grid; min-width: 0; }
  .name { justify-self: start; color: var(--ink); font: var(--type-label); }
  .role { color: var(--ink2); font: var(--type-small); }
  .site { color: var(--ink3); font: var(--type-small); }
  a { transition: color var(--fast) var(--ease); }
  a.name { text-decoration: underline; text-decoration-color: transparent; text-decoration-thickness: 2px; text-underline-offset: 4px; transition: text-decoration-color var(--fast) var(--ease); }
  @media (hover: hover) {
    a.name:hover { text-decoration-color: var(--wash2); }
    .site:hover { color: var(--ink); }
  }
</style>
