import { View, Text, useTheme, ScrollView } from "@ionizeio/canvas";
import { Platform } from "react-native";
import { COMPONENTS } from "../../../core/data/components";
import { CONTENT_TOP_INSET, CONTENT_BOTTOM_INSET } from "../../../shell/topbar";
import { ScreenFrame } from "../../../shell/native-header";
import { PageNav } from "../../../ui/page-nav";
import { H1 } from "../../../ui/prose";
import { sans } from "../../../ui/fonts";
import { CatSubBar, CatGroup } from "../../../catalog/tile";
import { TOKENS_TILES } from "../../../catalog/tokens";
import { ATOMS_TILES } from "../../../catalog/atoms";
import { MOLECULES_TILES } from "../../../catalog/molecules";
import { ORGANISMS_TILES } from "../../../catalog/organisms";
import { CHARTS_TILES } from "../../../catalog/charts";
import { TEMPLATES_TILES } from "../../../catalog/templates";
import { PATTERNS_TILES } from "../../../catalog/patterns";

const CATEGORY_IDS = ["Tokens", "Atoms", "Molecules", "Organisms", "Charts", "Templates", "Patterns"];

// A live catalog: a category pill bar + intro, then a tile
// grid per category, each tile a small mockup preview of the component linking to its reference.
export default function ComponentsIndex() {
  const { tokens, surface } = useTheme();
  const byCat = (c: string) => COMPONENTS.filter((x) => x.category === c).length;
  const counts = {
    Tokens: 3,
    Atoms: byCat("Atoms"),
    Molecules: byCat("Molecules"),
    Organisms: byCat("Organisms"),
    Charts: byCat("Charts"),
    Templates: 8,
    Patterns: 6,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <ScreenFrame>
    <ScrollView
      // The page scroller marker the web shell's scroll padding and the e2e helpers read
      // (docs/src/ui/page.tsx carries the same). Web-only attribute; a no-op on native.
      {...(Platform.OS === "web" ? ({ dataSet: { pageScroll: "" } } as object) : null)}
      // Glass surface mode: the canvas goes transparent so the Canvas Lattice backdrop
      // reads through (matching the shared Page); the per-category tiles stay solid content cards.
      style={{ flex: 1, backgroundColor: surface === "glass" ? "transparent" : tokens.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: CONTENT_TOP_INSET + 24, paddingHorizontal: 28, paddingBottom: Math.max(80, CONTENT_BOTTOM_INSET + 24), gap: 28, width: "100%", maxWidth: 1400, alignSelf: "center" }}
    >
      <H1>Components</H1>
      <CatSubBar categories={CATEGORY_IDS} total={total} />

      <Text style={{ fontFamily: sans("400"), fontSize: 13, lineHeight: 20.8, maxWidth: 672, color: tokens["muted-foreground"], marginTop: -12 }}>
        A live catalog of every component in the Canvas design system. Each tile is the real component
        rendered with the current theme. Open a tile for its full reference.
      </Text>

      <CatGroup label="Tokens" count={counts.Tokens} tiles={TOKENS_TILES} />
      <CatGroup label="Atoms" count={counts.Atoms} tiles={ATOMS_TILES} />
      <CatGroup label="Molecules" count={counts.Molecules} tiles={MOLECULES_TILES} />
      <CatGroup label="Organisms" count={counts.Organisms} tiles={ORGANISMS_TILES} />
      <CatGroup label="Charts" count={counts.Charts} tiles={CHARTS_TILES} />
      <CatGroup label="Templates" count={counts.Templates} tiles={TEMPLATES_TILES} />
      <CatGroup label="Patterns" count={counts.Patterns} tiles={PATTERNS_TILES} />

      <View style={{ marginTop: 8 }}>
        <PageNav />
      </View>
    </ScrollView>
    </ScreenFrame>
  );
}
