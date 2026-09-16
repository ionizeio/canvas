import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import canvasPkg from "../../../package.json";

// The version pill shows the latest PUBLISHED release of @ionizeio/canvas. It re-checks the
// npm registry EVERY time the screen using it gains focus (there is no "once per session"
// short-circuit), so the pill always reflects the current published version rather than a
// value cached at first load. Until the first fetch resolves — or if it fails (offline, etc.)
// — it falls back to the build-time version. A module-level last-known value seeds the initial
// render so a re-mount (web navigation) doesn't flash the fallback. Cross-platform: a plain
// fetch works on iOS, Android, and the web (the npm registry sends permissive CORS headers).
const FALLBACK = `v${canvasPkg.version}`;
const LATEST_URL = "https://registry.npmjs.org/@ionizeio/canvas/latest";

// Seeds the first render of a fresh mount; always re-validated by the focus fetch below.
let lastKnown: string | null = null;

export function useLatestVersion(): string {
  const [version, setVersion] = useState(lastKnown ?? FALLBACK);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      // cache: "no-store" so each check hits the network instead of a stale cached response.
      fetch(LATEST_URL, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { version?: string } | null) => {
          if (!active || typeof data?.version !== "string") return;
          lastKnown = `v${data.version}`;
          setVersion(lastKnown);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );
  return version;
}
