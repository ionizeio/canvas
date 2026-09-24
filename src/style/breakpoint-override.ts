import { createContext } from "react";
import type { BreakpointKey } from "./tokens.js";

// The simulation seam behind BreakpointOverride (src/style/responsive.tsx): a non-null
// value pins the bucket every viewport hook resolves for the subtree, overriding the
// real window. Its own module, outside the package index, so the portal layer can carry
// a publisher's override into the outlet it renders in without making the context a
// public export.
export const BreakpointOverrideContext = createContext<BreakpointKey | "base" | null>(null);
