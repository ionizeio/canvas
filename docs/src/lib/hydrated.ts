import { useSyncExternalStore } from "react";

// False for the server render and for the hydration render, true from the first
// commit on (and from the first render in a plain client or native render, which
// never hydrate). The same one-line contract the kit uses internally for the facts
// only a browser knows (`src/style/use-hydrated.ts`): every page is pre-rendered
// (app.json `web.output: "static"`), so anything read from the browser during the
// first render, a link's `?scheme=` seed, a measured width, would make React find
// markup the server never sent and rebuild the page. Defer it one render instead.
const subscribeNever = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

