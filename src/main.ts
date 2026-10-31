import { hydrate, mount } from "svelte";
import "@stdlogits/ledger/ledger.css";
import App from "./App.svelte";

// The build prerenders the page into #app (scripts/site/prerender.mjs), so the browser hydrates it;
// the dev server serves the empty shell, so there it mounts. 404.html marks #app data-missing.
const target = document.getElementById("app")!;
const props = { missing: target.hasAttribute("data-missing") };
if (target.firstElementChild) hydrate(App, { target, props });
else mount(App, { target, props });
