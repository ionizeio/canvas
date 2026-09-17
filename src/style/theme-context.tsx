import { createContext, type ReactNode } from "react";
import type { ThemeValue } from "./theme.js";

export const ThemeContext = createContext<ThemeValue | null>(null);

// Private handoff for Canvas's registry-based Portal. Reuse the resolved value
// exactly, including brand tokens, fonts and accessibility preferences, without
// rerunning ThemeProvider's public default or override resolution in the outlet.
// This module is deliberately absent from the public style barrel.
export function ResolvedThemeProvider({ value, children }: { value: ThemeValue; children: ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
