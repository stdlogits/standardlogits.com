// The server build's entry (`vite build --ssr`): scripts/site/prerender.mjs renders the page with it.
export { render } from "svelte/server";
export { default as App } from "./App.svelte";
