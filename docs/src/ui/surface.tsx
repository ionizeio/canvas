import { type ReactNode } from "react";
import { GlassSurface, useTheme, type StyleProp, type ViewStyle } from "@ionizeio/canvas";

// A docs CONTENT surface: the preview stages, prop tables, do/don't cards and the
// long-form panels. In solid mode it is an opaque `card` (or `muted`) panel; in glass
// mode it renders through the kit's GlassSurface as a CONTENT-layer pane, the same
// material a Card takes, so the docs are the kit's own layered glass model made
// visible: the aurora bends softly through the stage, the examples on it take their
// own control and pane materials, and the shell's bars float above it all.
//
// The stage once rendered through GlassSurface with `sheer` and read as a hole (the
// backdrop showed straight through, a tinted Emblem tile looked like glass); the
// content layer's tint is dense enough that text keeps its contrast and a tinted tile
// composites against a real pane, which is what makes the layering work now.
//
// `fill` picks the token: `card` for a content panel/stage/table, `muted` for a
// code/chip surface. `bordered` adds the standard rounded hairline frame (stripped
// under glass, where the material's rim is the edge). Pass extra border/radius/
// overflow through `style`.
export function DocsSurface({
  children,
  style,
  fill = "card",
  bordered = false,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fill?: "card" | "muted";
  bordered?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <GlassSurface
      layer="content"
      style={[
        { backgroundColor: tokens[fill] },
        bordered ? { borderWidth: 1, borderColor: tokens.border, borderRadius: 12, overflow: "hidden" } : null,
        style,
      ]}
    >
      {children}
    </GlassSurface>
  );
}
