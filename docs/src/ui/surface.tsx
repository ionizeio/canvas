import { type ReactNode } from "react";
import { useTheme, View, type StyleProp, type ViewStyle } from "@ionizeio/canvas";

// A docs CONTENT surface: the preview stages, prop tables, do/don't cards and the
// long-form panels. It is solid in every surface mode, because content is the layer
// the kit's glass model deliberately leaves alone: "don't use Liquid Glass in the
// content layer", which is also why the `card` token stays opaque while glass is on.
//
// It used to render through the kit's GlassSurface with `sheer`, so in glass mode it
// stripped its own fill and painted a thin frost. That turned every page's example
// stage into a hole: the backdrop's aurora read straight through the panes, and
// anything sitting ON a stage inherited the problem, so a tinted Emblem tile (a 12
// percent wash of its tone, which is meant to composite against an opaque card) came
// out looking like glass, and an Icon's pane showed the wash behind the glyph.
//
// Glass in these docs belongs to the SHELL only: the topbar, the sidebar and the
// mobile nav bar, which are the kit's own Navbar/Sidebar and take the material
// themselves. Nothing here should compete with them.
//
// `fill` picks the token: `card` for a content panel/stage/table, `muted` for a
// code/chip surface. `bordered` adds the standard rounded hairline frame. Pass extra
// border/radius/overflow through `style`.
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
    <View
      style={[
        { backgroundColor: tokens[fill] },
        bordered ? { borderWidth: 1, borderColor: tokens.border, borderRadius: 12, overflow: "hidden" } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
