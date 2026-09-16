import { type ReactNode } from "react";
import { View, Text, useTheme } from "@ionizeio/canvas";
import { sans, geistMono } from "./fonts";

// Prose primitives matching the previous web docs CSS exactly (Geist faces, the same sizes,
// weights, letter-spacing and token colors), so the React Native docs read identically
// on iOS / Android / web. Custom RN fonts carry weight via the family, not fontWeight.

export const MONO = geistMono("400");

// Page title — `.page-header h1`: 1.375rem / 600 / -0.02em.
export function H1({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: sans("600"), fontSize: 22, letterSpacing: -0.44, color: tokens.foreground }}>
      {children}
    </Text>
  );
}

// Section heading — `.h4`: 1rem / 600 / -0.01em.
export function H2({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Text accessibilityRole="header" aria-level={2} style={{ fontFamily: sans("600"), fontSize: 16, letterSpacing: -0.16, color: tokens.foreground }}>
      {children}
    </Text>
  );
}

// Sub-heading — `.h5`: 0.9375rem / 600.
export function H3({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return <Text accessibilityRole="header" aria-level={3} style={{ fontFamily: sans("600"), fontSize: 15, color: tokens.foreground }}>{children}</Text>;
}

// Body — `.body`: 0.875rem / 1.6.
export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Text style={{ fontFamily: sans("400"), fontSize: 14, lineHeight: 22, color: muted ? tokens["muted-foreground"] : tokens.foreground }}>
      {children}
    </Text>
  );
}

// Page description — `.sub` / the muted lede under a header.
export function Lead({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Text style={{ fontFamily: sans("400"), fontSize: 13.5, lineHeight: 21, color: tokens["muted-foreground"], maxWidth: 640 }}>
      {children}
    </Text>
  );
}

// Inline `<code>` — mono, subtle.
export function InlineCode({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return <Text style={{ fontFamily: MONO, fontSize: 12.5, color: tokens.foreground }}>{children}</Text>;
}

export function Rule() {
  const { tokens } = useTheme();
  return <View style={{ height: 1, backgroundColor: tokens.border }} />;
}
