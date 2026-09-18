import { use } from "react";
import { loadComponentDocs, type LoadedComponentDocs } from "./registry";
import type { ComponentDocs } from "./scope";

// How a page reads a component's docs module through the registry (see registry.ts).
// The request is Expo's async require promise carrying `_result`: the module itself
// whenever its chunk is already registered (native and the static render, which are
// single bundles, and a component page in the web export, which ships its own docs
// chunk before the bundle runs), so the first render and the hydration render are
// synchronous and match the server; a promise when the chunk still has to be fetched
// (a client-side navigation to another component), in which case the read suspends
// until it lands. A pending promise is cached per dir: `use` needs the same promise
// across renders, and the context hands out a new one on every call.
const pending = new Map<string, Promise<LoadedComponentDocs>>();

const isPromise = (value: unknown): value is Promise<LoadedComponentDocs> =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";

export function useComponentDocs(dir: string): ComponentDocs | undefined {
  const cached = pending.get(dir);
  if (cached) return use(cached).docs;
  const request = loadComponentDocs(dir);
  if (request === undefined) return undefined;
  const result = request._result ?? request;
  if (!isPromise(result)) return result.docs;
  pending.set(dir, result);
  return use(result).docs;
}
