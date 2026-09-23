import { View, Container } from "@ionizeio/canvas";
import { Page } from "../../../ui/page";
import { PageNav } from "../../../ui/page-nav";
import { Playground } from "../../../ui/playground";
import type { DocExample } from "../../../core/scope";
import { TokenH1, TokenLede, TokenSection } from "../../../ui/tokens-kit";

// The kit's 4px-grid spacing scale, shown as padding steps.
const SPACING = [4, 8, 12, 16, 20, 24, 32, 40, 48];

// The radius ladder (styles/tokens/radius.css; radius in src/style/tokens.ts).
// "base" is the unnamed --radius / radius.DEFAULT step.
const RADII = [
  { name: "none", px: 0 }, { name: "sm", px: 2 }, { name: "base", px: 4 }, { name: "md", px: 6 },
  { name: "lg", px: 8 }, { name: "xl", px: 12 }, { name: "2xl", px: 16 }, { name: "3xl", px: 24 },
  { name: "full", px: 9999 },
];

// The six-level shadow() preset (src/style/shadow.ts), each called with the theme's
// tokens so the shade takes the active palette. "DEFAULT" is the unnamed middle level.
// There is no "2xl".
const SHADOW_LEVELS = [
  { key: "none", label: 'shadow("none")' }, { key: "sm", label: 'shadow("sm", tokens)' }, { key: "DEFAULT", label: 'shadow("DEFAULT", tokens)' },
  { key: "md", label: 'shadow("md", tokens)' }, { key: "lg", label: 'shadow("lg", tokens)' }, { key: "xl", label: 'shadow("xl", tokens)' },
] as const;

// Spacing scale as live padding demos: the outer box is padded by the step, so the
// inset between it and the inner box IS the spacing value.
const spacingExamples: DocExample[] = SPACING.map((px) => ({
  label: `padding: ${px}`,
  code: `<View style={{ alignSelf: "center", padding: ${px}, borderRadius: 8, backgroundColor: alpha(tokens.primary, 0.2) }}>
  <View style={{ width: 96, height: 48, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.4) }} />
</View>`,
  render: (scope) => {
    const { View, tokens, alpha } = scope;
    return (
      <View style={{ alignSelf: "center", padding: px, borderRadius: 8, backgroundColor: alpha(tokens.primary, 0.2) }}>
        <View style={{ width: 96, height: 48, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.4) }} />
      </View>
    );
  },
}));

const radiusExamples: DocExample[] = RADII.map((r) => ({
  label: r.name === "full" ? "full" : `${r.name} · ${r.px}px`,
  code: `<View style={{ width: 96, height: 96, borderRadius: ${r.px}, backgroundColor: alpha(tokens.primary, 0.2), borderWidth: 1, borderColor: alpha(tokens.primary, 0.4) }} />`,
  render: (scope) => {
    const { View, tokens, alpha } = scope;
    return (
      <View style={{ width: 96, height: 96, borderRadius: r.px, backgroundColor: alpha(tokens.primary, 0.2), borderWidth: 1, borderColor: alpha(tokens.primary, 0.4) }} />
    );
  },
}));

// Each level renders the real shadow() helper, so the Web row shows Dark Factory's
// downward shade and the iOS / Android rows the platform geometry the preset ships.
const shadowExamples: DocExample[] = SHADOW_LEVELS.map((s) => ({
  label: s.label,
  code: `<View style={[{ width: 96, height: 96, borderRadius: 12, backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border }, ${s.label}]} />`,
  render: (scope) => {
    const { View, tokens, shadow } = scope;
    return (
      <View style={[{ width: 96, height: 96, borderRadius: 12, backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border }, shadow(s.key, tokens)]} />
    );
  },
}));

// Three overlapping cards at the real reserve levels: the higher zIndex paints on
// top regardless of document order, so 50 covers 10 covers the unlayered base.
const zIndexExamples: DocExample[] = [
  {
    label: "Stacking",
    code: `<View style={{ width: 230, height: 116 }}>
  <View style={{ position: "absolute", left: 0, top: 6, width: 100, height: 68, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.card, borderWidth: 1, borderColor: alpha(tokens.primary, 0.5), zIndex: 50 }}>
    <Text style={{ fontSize: 12, fontWeight: "600", color: tokens.primary }}>zIndex: 50</Text>
  </View>
  <View style={{ position: "absolute", left: 64, top: 24, width: 100, height: 68, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.card, borderWidth: 1, borderColor: alpha(tokens.primary, 0.5), zIndex: 10 }}>
    <Text style={{ fontSize: 12, fontWeight: "600", color: tokens.primary }}>zIndex: 10</Text>
  </View>
  <View style={{ position: "absolute", left: 128, top: 42, width: 100, height: 68, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.card, borderWidth: 1, borderColor: alpha(tokens.primary, 0.5) }}>
    <Text style={{ fontSize: 12, fontWeight: "600", color: tokens.primary }}>no zIndex</Text>
  </View>
</View>`,
    render: (scope) => {
      const { View, Text, tokens, alpha } = scope;
      return (
        <View style={{ width: 230, height: 116 }}>
          <View style={{ position: "absolute", left: 0, top: 6, width: 100, height: 68, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.card, borderWidth: 1, borderColor: alpha(tokens.primary, 0.5), zIndex: 50 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: tokens.primary }}>zIndex: 50</Text>
          </View>
          <View style={{ position: "absolute", left: 64, top: 24, width: 100, height: 68, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.card, borderWidth: 1, borderColor: alpha(tokens.primary, 0.5), zIndex: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: tokens.primary }}>zIndex: 10</Text>
          </View>
          <View style={{ position: "absolute", left: 128, top: 42, width: 100, height: 68, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tokens.card, borderWidth: 1, borderColor: alpha(tokens.primary, 0.5) }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: tokens.primary }}>no zIndex</Text>
          </View>
        </View>
      );
    },
  },
];

// Card carries a real density axis (compact / default / comfortable), so it shows
// the spacing change on an actual component.
// The inner text column is identical in all three; only the card's own density
// changes, so the surface inset (16 / 24 / 32) is the whole visual difference.
// Density retunes the surface inset on the raw-children path only (the string
// form's sections pad themselves), hence the composed children here.
const densityExamples: DocExample[] = [
  {
    label: "compact",
    code: `<Container xxs start>
  <Card compact>
    <Column tight>
      <Typography lead semibold>Storage</Typography>
      <Typography small muted>84% of 512 GB used.</Typography>
    </Column>
  </Card>
</Container>`,
    render: (scope) => {
      const { Card, Column, Container, Typography } = scope;
      return (
        <Container xxs start>
          <Card compact>
            <Column tight>
              <Typography lead semibold>Storage</Typography>
              <Typography small muted>84% of 512 GB used.</Typography>
            </Column>
          </Card>
        </Container>
      );
    },
  },
  {
    label: "default",
    code: `<Container xxs start>
  <Card>
    <Column tight>
      <Typography lead semibold>Storage</Typography>
      <Typography small muted>84% of 512 GB used.</Typography>
    </Column>
  </Card>
</Container>`,
    render: (scope) => {
      const { Card, Column, Container, Typography } = scope;
      return (
        <Container xxs start>
          <Card>
            <Column tight>
              <Typography lead semibold>Storage</Typography>
              <Typography small muted>84% of 512 GB used.</Typography>
            </Column>
          </Card>
        </Container>
      );
    },
  },
  {
    label: "comfortable",
    code: `<Container xxs start>
  <Card comfortable>
    <Column tight>
      <Typography lead semibold>Storage</Typography>
      <Typography small muted>84% of 512 GB used.</Typography>
    </Column>
  </Card>
</Container>`,
    render: (scope) => {
      const { Card, Column, Container, Typography } = scope;
      return (
        <Container xxs start>
          <Card comfortable>
            <Column tight>
              <Typography lead semibold>Storage</Typography>
              <Typography small muted>84% of 512 GB used.</Typography>
            </Column>
          </Card>
        </Container>
      );
    },
  },
];

export default function SpacingScreen() {
  return (
    <Page>
      <View style={{ gap: 40 }}>
        {/* Intro */}
        <View style={{ gap: 12 }}>
          <TokenH1>Spacing & Shape</TokenH1>
          <TokenLede>
            The 4px grid governs all of Canvas. Every padding, margin, gap, width, and height is a multiple of 4. Radii follow a fixed ladder from none to 3xl (0 to 24px, around the unnamed 4px base) plus full for pills; components read those radius tokens directly. Shadows are a fixed elevation preset (none, sm, the default, md, lg, xl), shipped by the shadow() helper.
          </TokenLede>
        </View>

        <TokenSection
          title="Spacing ramp"
          description="The kit's own 4px-based scale (here applied as padding; the same numbers back margin and gap). We use 4 through 48 in practice; anything larger should probably be a layout decision instead of an in-component value. Switch the rail to compare the steps."
        >
          <Playground examples={spacingExamples} />
        </TokenSection>

        <TokenSection
          title="Radius scale"
          description="A fixed ladder, none through 3xl, plus full for pills. The unnamed 4px base is the --radius token on the web and radius.DEFAULT in JS; native and web read the same scale, step for step. Shape aliases pin components to a step: control (6) and card (8) on the web, control-ios (10) and card-ios / card-android (12) on native, pill for capsules."
          anatomy="Components pin to a relative tier or a shape alias rather than hardcoding pixels, so radii stay proportional across the kit. The tiers are fixed tokens, not a runtime-adjustable knob."
        >
          <Playground examples={radiusExamples} />
        </TokenSection>

        <TokenSection
          title="Shadows"
          description="A fixed elevation preset, low to high, from the shadow() helper. Pass the theme's tokens and every level takes the palette's shade: on the web it is Dark Factory's shade, cast straight down and pooling under the lower edge, and on iOS and Android the same level keeps its platform shadow and elevation, retinted. xl, the dialog's shade, is black on every palette. Choose by elevation, not by style."
        >
          <Playground examples={shadowExamples} />
        </TokenSection>

        <TokenSection
          title="Z-index reserves"
          description="Canvas keeps a deliberately shallow z-index scale. Components reach for just two reserves; every floating overlay shares the top one rather than escalating into magic numbers. The higher zIndex paints on top regardless of document order, so 50 covers 10 covers the unlayered base."
          anatomy="The reserves: 10 for in-component layering (input addons, button-group overlaps) and 50 for every floating overlay (dropdowns, popovers, selects, autocomplete, command, row menus). Above them sit only two pieces of infrastructure, the drag layer (900) and the portal outlet (1000); no component style escalates past 50 on its own."
        >
          <Playground examples={zIndexExamples} />
        </TokenSection>

        <TokenSection
          title="Component density"
          description="Density is a per-component axis: compact and comfortable are boolean props each component maps to its own metrics, so there is no single global padding token and no app-wide density stylesheet. The Card below shows the levels: compact tightens to 16px padding and comfortable opens to 32px, bracketing the 24px default. On the web, setDensity() only persists a preference and broadcasts it for the app to read back (getDensity) and map onto these props; the data-density attribute it writes restyles nothing by itself."
        >
          <Playground examples={densityExamples} />
        </TokenSection>

        <PageNav />
      </View>
    </Page>
  );
}
