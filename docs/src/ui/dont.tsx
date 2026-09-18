import { type ReactNode } from "react";
import { Platform } from "react-native";
import { View, Text, Icon, Column, alpha, palette, useTheme, useResponsive, type StyleProp, type ViewStyle } from "@ionizeio/canvas";
import { buildScopes } from "../core/build-scopes";
import type { DocDontPair } from "../core/scope";
import { CodeBlock } from "./code-block";
import { ExampleErrorBoundary } from "./playground";
import { DocsSurface } from "./surface";
import { sans } from "./fonts";

export interface DoDontCardProps {
  // Treatment axis: `dont` is the red card, and everything else is the green Do card.
  // `do` is nameable at the call site for symmetry in a pair, but it is inert: `dont`
  // is the only member that changes the render, and it wins when both are passed.
  do?: boolean;
  dont?: boolean;
  // The muted line under the body, saying why this side is right or wrong.
  caption: string;
  // Body, pick one. `children` is a LIVE preview: pass the rendered example and the card
  // frames it exactly as a component page does. `code` shows the source through the docs
  // CodeBlock instead, which is what a Don't that cannot compile needs (the colors page
  // demonstrates string-enum props the kit deliberately does not have, so those fences
  // exist as text only).
  code?: string;
  children?: ReactNode;
  // Layout composition only (the row parent passes flex:1 for equal columns).
  // The card must NOT own it: flex:1 inside a phone-width COLUMN parent is
  // flexBasis 0 against an auto height, which clips the tallest card's caption.
  style?: StyleProp<ViewStyle>;
}

// One side of a Do/Don't pair: the red Don't card or the green Do card, carrying a body
// (live preview or code) above its caption.
export function DoDontCard(props: DoDontCardProps) {
  const { caption, code, children, style } = props;
  const { tokens, dark } = useTheme();
  // `dont` alone decides the treatment. `do` is accepted so a call site can NAME the
  // side it means (`<DoDontCard do>` reads better in a pair than a bare tag), but it
  // does not participate in resolution: with only two states, the absence of `dont`
  // already is the Do side, so reading `do` could not change any outcome.
  const isDont = props.dont === true;
  // The wash reads from the kit palette rather than a hand-written color, so the do/don't
  // red and green track the token layer: palette red-500 / green-500 at the border and
  // fill alphas.
  const tone = isDont ? palette["red-500"] : palette["green-500"];
  const border = alpha(tone, 0.3);
  const bg = alpha(tone, 0.05);
  // Label and glyph share the kit tone colors so they match exactly: the
  // destructive token for Don't, the palette green (Alert's success shade) for Do.
  const labelColor = isDont ? tokens.destructive : dark ? palette["green-400"] : palette["green-600"];
  return (
    // Solid card in solid mode, frost in glass mode (DocsSurface), with the do/don't
    // red/green wash laid over it as an overlay so the card never reads as a clear hole.
    <DocsSurface style={[{ borderRadius: 12, borderWidth: 1, borderColor: border, padding: 20, gap: 8 }, style]}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bg, pointerEvents: "none" }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {isDont ? <Icon circleX destructive size={14} /> : <Icon circleCheck success size={14} />}
        <Text style={{ fontFamily: sans("600"), fontSize: 13, color: labelColor }}>{isDont ? "Don’t" : "Do"}</Text>
      </View>
      {children === undefined ? null : (
        <View
          // Same preview-scrollbar suppression as the Playground stage (see web-scrollbar.tsx):
          // hide the browser scrollbar a scrollable demo would draw here. Web-only; no-op native.
          {...(Platform.OS === "web" ? ({ dataSet: { previewStage: "" } } as object) : null)}
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}
        >
          <ExampleErrorBoundary>{children}</ExampleErrorBoundary>
        </View>
      )}
      {code === undefined ? null : <CodeBlock code={code} wrap />}
      <Text style={{ fontFamily: sans("400"), fontSize: 12, lineHeight: 18, color: tokens["muted-foreground"] }}>{caption}</Text>
    </DocsSurface>
  );
}

// The Do/Don't section: each pair is the red Don't card beside the green Do card
// (stacked on a phone), matching the component page's donts-grid.
export function Donts({ donts }: { donts: DocDontPair[] }) {
  const { tokens } = useTheme();
  // A pair sits side by side only when each card can actually HOLD its example.
  // Examples are authored up to 560 wide; a card adds 20 of padding either side, the
  // pair adds a 16 gap, and the page adds 28 of padding either side, so two of them
  // need 2 * (560 + 40) + 16 + 56 = 1272 before anything fits. The threshold used to
  // be 768, which gave each card about 348 of inner width and silently CLIPPED the
  // right-hand side of every chart, table and wide row in the section: the page's
  // scroller is overflow-hidden, so nothing scrolled to reveal it and nothing warned.
  // At and below the xl bucket (1280) the pair stacks and each card gets the full
  // column; the kit's bucket hook, not a raw window read, so the server and the
  // hydration render agree on the desktop layout.
  const wide = useResponsive({ base: true, xl: false });
  const previews = buildScopes(tokens);
  const scope = previews[previews.length - 1].scope;

  return (
    <Column relaxed>
      <Text accessibilityRole="header" aria-level={2} style={{ fontFamily: sans("600"), fontSize: 20, letterSpacing: -0.3, color: tokens.foreground }}>Don’ts</Text>
      {donts.map((d, i) => (
        <Column key={i} snug>
          {d.title ? (
            <Text accessibilityRole="header" aria-level={3} style={{ fontFamily: sans("600"), fontSize: 13, color: tokens.foreground }}>{d.title}</Text>
          ) : null}
          <View style={{ flexDirection: wide ? "row" : "column", gap: 16 }}>
            <DoDontCard dont caption={d.dont.caption} style={wide ? { flex: 1 } : null}>{d.dont.render(scope)}</DoDontCard>
            <DoDontCard do caption={d.do.caption} style={wide ? { flex: 1 } : null}>{d.do.render(scope)}</DoDontCard>
          </View>
        </Column>
      ))}
    </Column>
  );
}
