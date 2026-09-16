import { type ReactNode } from "react";
import { View, Text, Column, useTheme } from "@nannier-com/canvas";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { sans, geistMono } from "./fonts";
import { alpha } from "./color";
import { useFluidType } from "../lib/fluid-type";

// Shared primitives for the token reference pages (Colors, Spacing, Typography, Layout).
// These pages use a LARGER heading scale than the component/guide pages: the page
// h1 is clamp(32,5vw,40)/700/-0.025em and each section h2 is 20px/600/-0.015em,
// with a muted "Anatomy." / "Try this." callout. Built with Geist + tokens so the RN pages
// read identically on every platform.

// Page title — clamp(32px, 5vw, 40px) / 700 / -0.025em.
export function TokenH1({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  const size = useFluidType(32, 40, 0.05);
  return (
    <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: sans("700"), fontSize: size, letterSpacing: size * -0.025, color: tokens.foreground }}>
      {children}
    </Text>
  );
}

// Page lede under the title — 14.5 / 1.6, muted, max ~42rem.
export function TokenLede({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Text style={{ fontFamily: sans("400"), fontSize: 14.5, lineHeight: 23.2, color: tokens["muted-foreground"], maxWidth: 672 }}>
      {children}
    </Text>
  );
}

// The muted callout box ("Anatomy." / "Try this." / etc.): a label run-in followed by body.
export function Callout({ label, children }: { label: string; children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ padding: 14, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: alpha(tokens.muted, 0.4) }}>
      <Text style={{ fontFamily: sans("400"), fontSize: 12.5, lineHeight: 19, color: tokens["muted-foreground"] }}>
        <Text style={{ fontFamily: sans("600"), color: tokens.foreground }}>{label} </Text>
        {children}
      </Text>
    </View>
  );
}

// A token-page section: 20px/600 title + optional 13.5 muted description + optional
// Anatomy callout + the body. Sections stack with 40px rhythm (gap on the parent).
export function TokenSection({ title, description, anatomy, children }: {
  title: string;
  description?: string;
  anatomy?: string;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <Column relaxed>
      <Column tight>
        <Text accessibilityRole="header" aria-level={2} style={{ fontFamily: sans("600"), fontSize: 20, letterSpacing: -0.3, color: tokens.foreground }}>{title}</Text>
        {description ? (
          <Text style={{ fontFamily: sans("400"), fontSize: 13.5, lineHeight: 21.6, color: tokens["muted-foreground"], maxWidth: 640 }}>{description}</Text>
        ) : null}
      </Column>
      {anatomy ? <Callout label="Anatomy.">{anatomy}</Callout> : null}
      {children}
    </Column>
  );
}

// A monospace inline pill — `.code` chip: muted fill, bordered, radius-sm.
export function Chip({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ borderRadius: 4, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.muted, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontFamily: geistMono("400"), fontSize: 11.5, color: tokens.foreground }}>{children}</Text>
    </View>
  );
}

// A bare linear-gradient fill (RN has no CSS gradient; render it with react-native-svg).
// No border/radius of its own — it sits in SwatchCard's clipped top region. `angle`
// is the direction in degrees (135 = top-left → bottom-right, the default).
// Children render centered on top. A per-instance gradient id avoids url(#id)
// collisions when several gradient fills render on the same page.
export function GradientFill({ colors, height = 80, angle = 135, children }: {
  colors: [string, string];
  height?: number;
  angle?: number;
  children?: ReactNode;
}) {
  // Convert the CSS gradient angle to SVG x1/y1→x2/y2 (CSS 0deg points up; here we use
  // the simple 135deg default mapping top-left to bottom-right).
  const rad = (angle - 90) * (Math.PI / 180);
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  const gid = `g${colors.join("")}`.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View style={{ height }}>
      <Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id={gid} x1={`${50 - x * 50}%`} y1={`${50 - y * 50}%`} x2={`${50 + x * 50}%`} y2={`${50 + y * 50}%`}>
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
      <Column fill flush center alignCenter>{children}</Column>
    </View>
  );
}

// An equal-width responsive grid: lay `children` out in rows of `cols`, each cell flex:1.
// On narrow viewports pass a smaller `cols`. Mirrors a `repeat(N, 1fr)` swatch grid.
export function Grid({ children, cols, gap = 16 }: { children: ReactNode[]; cols: number; gap?: number }) {
  const items = children.filter(Boolean);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={{ gap }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", gap }}>
          {row.map((cell, j) => <View key={j} style={{ flex: 1, minWidth: 0 }}>{cell}</View>)}
          {row.length < cols ? Array.from({ length: cols - row.length }).map((_, j) => <View key={`p${j}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}

// A bordered card surface (radius-xl 12, border, card bg, padding) used by the
// typography font cards, "how theming works" code cards, etc.
export function Surface({ children, padding = 20, style }: { children: ReactNode; padding?: number; style?: object }) {
  const { tokens } = useTheme();
  return (
    <View style={[{ borderRadius: 12, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding }, style]}>
      {children}
    </View>
  );
}
