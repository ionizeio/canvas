import type { ReactNode } from "react";
import { useHydrated } from "../lib/hydrated";

// Render children on the client only: nothing in the server markup, nothing in the
// hydration render, the children from the first commit on. For the runtime fixtures
// under app/(home)/testing, whose bodies are driven by facts a pre-render cannot
// know (a `?scenario=` query, the pixel ratio, an editor counter that keeps ticking
// across the export's page renders) and which nothing indexes; pre-rendering them
// only bought a hydration mismatch and a rebuilt tree.
export function ClientOnly({ children }: { children: ReactNode }) {
  return useHydrated() ? <>{children}</> : null;
}
