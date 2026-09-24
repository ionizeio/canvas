// The running bundle's over-the-air update identity, for the diagnostics route. This
// default module is the web build's (Metro picks update-identity.native.ts on iOS and
// Android, and tsc resolves the import here): the web has no update system, so it
// reports none.
//
// It also keeps expo-updates out of the web bundles, which matters beyond the bytes.
// expo-updates subscribes at evaluation time (UpdatesEmitter's module-scope
// `addListener`) to its web module object, which `registerWebModule` keeps on the
// process-wide `globalThis.expo.modules`. A browser evaluates the bundle once per page,
// but the docs dev server evaluates the web server bundle again for every document it
// renders, so each render added a listener whose closure pinned that render's whole
// bundle, about 20 MB, and the server ran out of heap after 50 to 100 pages.
// tools/docs/web-bundle-imports.test.ts keeps expo-updates in native modules only.

export interface UpdateIdentity {
  /** The id of the running update, or null where there is none (the web, a development build). */
  updateId: string | null;
  /** Whether the running bundle is the one embedded in the binary, or null where the question does not apply. */
  isEmbeddedLaunch: boolean | null;
}

/** The web has no over-the-air updates. */
export function readUpdateIdentity(): UpdateIdentity {
  return { updateId: null, isEmbeddedLaunch: null };
}
