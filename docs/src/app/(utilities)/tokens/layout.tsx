import { View, Text, Row, Column, useTheme, useResponsive } from "@nannier-com/canvas";
import { useRouter } from "expo-router";
import type { DocExample, ExampleScope } from "../../../core/scope";
import { Page } from "../../../ui/page";
import { PageNav } from "../../../ui/page-nav";
import { CodeBlock } from "../../../ui/code-block";
import { Playground } from "../../../ui/playground";
import { sans } from "../../../ui/fonts";
import { alpha } from "../../../ui/color";
import { TokenH1, TokenLede, TokenSection, Chip } from "../../../ui/tokens-kit";

// The layout guide. Canvas lays out with plain React Native style objects on the raw
// View primitive (flexbox). Each demo is a live <Playground>: the fence is the real
// code, rendered across iOS / Android / Web so the page shows the same layout runs
// identically on every platform (the layout is platform-agnostic, so the three rows
// match, which is the point).

// The kit's 4px-grid spacing scale (plus the 1px hairline and the 2/6 half steps)
// as the px values gap/padding/margin take.
const GAP_SCALE: number[] = [0, 1, 2, 4, 6, 8, 12, 16, 24, 32];

// Shared swatch fills for the live demo boxes. Inlined into each fence string verbatim
// so the displayed code reads as real, copyable View layout code.
const BOX = `borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2)`;
const BOXFILL = `borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.4)`;

const directionExamples: DocExample[] = [
  {
    label: "Row",
    code: `<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
  <View style={{ width: 72, height: 40, ${BOX} }} />
  <View style={{ width: 72, height: 40, ${BOX} }} />
  <View style={{ width: 72, height: 40, ${BOX} }} />
</View>`,
    render: (s: ExampleScope) => {
      const { View, tokens, alpha } = s;
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 72, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: 72, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: 72, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        </View>
      );
    },
  },
  {
    label: "Column",
    code: `<View style={{ flexDirection: "column", gap: 8 }}>
  <View style={{ width: 160, height: 32, ${BOX} }} />
  <View style={{ width: 160, height: 32, ${BOX} }} />
  <View style={{ width: 160, height: 32, ${BOX} }} />
</View>`,
    render: (s: ExampleScope) => {
      const { View, tokens, alpha } = s;
      return (
        <View style={{ flexDirection: "column", gap: 8 }}>
          <View style={{ width: 160, height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: 160, height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: 160, height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        </View>
      );
    },
  },
];

const alignmentExamples: DocExample[] = [
  {
    label: "Space between",
    code: `<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: 320 }}>
  <View style={{ width: 72, height: 40, ${BOX} }} />
  <View style={{ width: 72, height: 40, ${BOX} }} />
  <View style={{ width: 72, height: 40, ${BOX} }} />
</View>`,
    render: (s: ExampleScope) => {
      const { View, tokens, alpha } = s;
      return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: 320 }}>
          <View style={{ width: 72, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: 72, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: 72, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        </View>
      );
    },
  },
  {
    label: "Centered",
    code: `<View style={{ flexDirection: "row", justifyContent: "center", gap: 8, width: 320 }}>
  <View style={{ width: 80, height: 40, ${BOX} }} />
  <View style={{ width: 80, height: 40, ${BOX} }} />
</View>`,
    render: (s: ExampleScope) => {
      const { View, tokens, alpha } = s;
      return (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, width: 320 }}>
          <View style={{ width: 80, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: 80, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        </View>
      );
    },
  },
];

const flexExamples: DocExample[] = [
  {
    label: "flex: 1",
    code: `<View style={{ flexDirection: "row", gap: 8, width: 320 }}>
  <View style={{ width: 56, height: 40, ${BOX} }} />
  <View style={{ flex: 1, height: 40, ${BOXFILL} }} />
  <View style={{ width: 56, height: 40, ${BOX} }} />
</View>`,
    render: (s: ExampleScope) => {
      const { View, tokens, alpha } = s;
      return (
        <View style={{ flexDirection: "row", gap: 8, width: 320 }}>
          <View style={{ width: 56, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ flex: 1, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.4) }} />
          <View style={{ width: 56, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        </View>
      );
    },
  },
];

const sizingExamples: DocExample[] = [
  {
    label: "Percent widths",
    code: `<View style={{ flexDirection: "row", gap: 8, width: 320 }}>
  <View style={{ width: "50%", height: 40, ${BOX} }} />
  <View style={{ width: "25%", height: 40, ${BOX} }} />
  <View style={{ width: "25%", height: 40, ${BOX} }} />
</View>`,
    render: (s: ExampleScope) => {
      const { View, tokens, alpha } = s;
      return (
        <View style={{ flexDirection: "row", gap: 8, width: 320 }}>
          <View style={{ width: "50%", height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: "25%", height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: "25%", height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        </View>
      );
    },
  },
  {
    label: "Fixed & full",
    code: `<View style={{ flexDirection: "column", gap: 8, width: 320 }}>
  <View style={{ width: "100%", height: 32, ${BOX} }} />
  <View style={{ width: 160, height: 32, ${BOX} }} />
</View>`,
    render: (s: ExampleScope) => {
      const { View, tokens, alpha } = s;
      return (
        <View style={{ flexDirection: "column", gap: 8, width: 320 }}>
          <View style={{ width: "100%", height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
          <View style={{ width: 160, height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        </View>
      );
    },
  },
];

const composingExamples: DocExample[] = [
  {
    label: "Last wins",
    code: `<View style={{ flexDirection: "column", gap: 12, width: 320 }}>
  <View style={[{ width: 160 }, { height: 32, ${BOX} }]} />
  <View style={[{ width: 160 }, { width: "100%", height: 32, ${BOXFILL} }]} />
</View>`,
    render: (s: ExampleScope) => {
      const { View, tokens, alpha } = s;
      return (
        <View style={{ flexDirection: "column", gap: 12, width: 320 }}>
          <View style={[{ width: 160 }, { height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }]} />
          <View style={[{ width: 160 }, { width: "100%" as const, height: 32, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.4) }]} />
        </View>
      );
    },
  },
];

// The spacing scale as live gap demos: one rail item per step (gap: 0 .. gap: 32).
const gapExamples: DocExample[] = GAP_SCALE.map((px) => ({
  label: `gap: ${px}`,
  code: `<View style={{ flexDirection: "row", gap: ${px} }}>
  <View style={{ width: 56, height: 40, ${BOX} }} />
  <View style={{ width: 56, height: 40, ${BOX} }} />
  <View style={{ width: 56, height: 40, ${BOX} }} />
</View>`,
  render: (s: ExampleScope) => {
    const { View, tokens, alpha } = s;
    return (
      <View style={{ flexDirection: "row", gap: px }}>
        <View style={{ width: 56, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        <View style={{ width: 56, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
        <View style={{ width: 56, height: 40, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.2) }} />
      </View>
    );
  },
}));

// A small labelled tile used by the responsive demo: a primary
// tinted, bordered box with centered 12px/600 primary text.
function Tile({ children }: { children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        backgroundColor: alpha(tokens.primary, 0.15),
        borderWidth: 1,
        borderColor: alpha(tokens.primary, 0.35),
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
      }}
    >
      <Text style={{ fontFamily: sans("600"), fontSize: 12, color: tokens.primary, textAlign: "center" }}>{children}</Text>
    </View>
  );
}

// useResponsive is a hook, so the responsive demo lives in its own component. It
// collapses from a row on desktop to a column at the md breakpoint and below.
function ResponsiveDemo() {
  const direction = useResponsive<"row" | "column">({ base: "row", md: "column" });
  return (
    <View style={{ flexDirection: direction, gap: 12 }}>
      <Tile>a row on desktop</Tile>
      <Tile>that stacks at md</Tile>
      <Tile>and below</Tile>
    </View>
  );
}

// A hook + a window resize drive this one, so it can't be a stateless fence like the
// others; it renders the live component above with its real source beside it.
const responsiveCode = `function Toolbar() {
  // Desktop-first: base is the desktop value; md applies at 768px and below.
  const direction = useResponsive({ base: "row", md: "column" });

  return (
    <View style={{ flexDirection: direction, gap: 12 }}>
      <Text>a row on desktop</Text>
      <Text>that stacks at md and below</Text>
    </View>
  );
}`;

export default function LayoutScreen() {
  const { tokens } = useTheme();
  const router = useRouter();

  return (
    <Page>
      <View style={{ gap: 40 }}>
        {/* Intro */}
        <Column cozy>
          <TokenH1>Layout & flexbox</TokenH1>
          <TokenLede>
            Canvas lays out with plain React Native style objects on the raw View primitive, so the same code runs on iOS, Android, and the web. Layout is flexbox: React Native has no CSS grid. The spacing scale is the kit's own 4px grid expressed as numbers (gap: 16 is four steps on the grid), and the useResponsive hook handles breakpoints, so a value can change with the viewport.
          </TokenLede>
          <Text style={{ fontFamily: sans("400"), fontSize: 13, lineHeight: 20.8, color: tokens["muted-foreground"] }}>
            New to the building blocks? See{" "}
            <Text style={{ fontFamily: sans("500"), color: tokens.primary }} onPress={() => router.push("/rn-primitives")}>
              React Native primitives
            </Text>{" "}
            for View, Text, and the rest of the primitives this guide composes.
          </Text>
        </Column>

        <TokenSection
          title="How layout works"
          description="A View is a flex container; you set its layout with a style object (flexDirection, alignItems, justifyContent, gap, ...). Numbers are density-independent pixels. A style array merges left to right, so the last entry wins, which is how a component's outer style prop (layout composition within a parent, never a restyle hook) lands after its own base styles."
          anatomy="Responsive values come from useResponsive({ base, sm, md, ... }), which is desktop-first: base is the desktop value, and a breakpoint entry applies at that width AND BELOW, with the smallest matching breakpoint winning. This is the inverse of mobile-first. Breakpoints (and below): sm 640, md 768, lg 1024, xl 1280, 2xl 1536."
        >
          <Row wrap snug>
            <Chip>flexDirection: "row"</Chip>
            <Chip>alignItems: "center"</Chip>
            <Chip>gap: 8</Chip>
            <Chip>flex: 1</Chip>
            <Chip>width: "50%"</Chip>
          </Row>
        </TokenSection>

        <TokenSection
          title="Display & direction"
          description="React Native defaults a View to a column, so set flexDirection: 'row' for a row. There is no display:flex toggle (every View is already a flex container); use display:'none' to hide."
        >
          <Playground examples={directionExamples} />
        </TokenSection>

        <TokenSection
          title="Alignment"
          description="justifyContent controls the main axis; alignItems the cross axis. Use alignSelf for a single child, and flexGrow / flexShrink to tune how children flex. (space-between needs a bounded width, hence the fixed 320 here.)"
        >
          <Playground examples={alignmentExamples} />
        </TokenSection>

        <TokenSection
          title="Gap"
          description="gap (and columnGap / rowGap) takes a number from the spacing scale. The same scale backs padding and margin, so a layout reads in one vocabulary: gap: 16 is four steps up the 4px grid. Switch the rail to compare the steps."
        >
          <Playground examples={gapExamples} />
        </TokenSection>

        <TokenSection
          title="Flex sizing"
          description="flex: 1 makes a child fill the remaining space; flexGrow / flexShrink / flexBasis tune how children flex. Combine with the sizing properties below."
        >
          <Playground examples={flexExamples} />
        </TokenSection>

        <TokenSection
          title="Sizing"
          description="width / height take a number (px), a percentage string ('50%', '100%'), or 'auto'. minWidth / maxWidth / minHeight / maxHeight round it out. There are no fraction utilities: write the percentage you want."
        >
          <Playground examples={sizingExamples} />
        </TokenSection>

        <TokenSection
          title="Responsive (desktop-first)"
          description="useResponsive({ base, md, ... }) returns the active value for the viewport. Because the model is desktop-first, a breakpoint entry applies at that width and BELOW. Resize the window across the md (768px) boundary to watch the live preview switch from a row to a column."
        >
          <View>
            <Column flush center alignCenter
              style={{
                borderWidth: 1,
                borderColor: tokens.border,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                borderBottomWidth: 0,
                backgroundColor: tokens.background,
                minHeight: 84,
                paddingVertical: 24,
                paddingHorizontal: 16,
              }}
            >
              <ResponsiveDemo />
            </Column>
            <CodeBlock code={responsiveCode} flush />
          </View>
        </TokenSection>

        <TokenSection
          title="Composing styles"
          description="Pass an array of style objects and the later entries win, the same merge React Native uses. Canvas components also take a style prop applied last, strictly for outer layout composition within a parent (a width, a flex); it is never a restyle hook."
          anatomy="Below, the base sets a fixed 160px width; the second entry in the array overrides it to 100%, because a style array is applied left to right and the last value wins."
        >
          <Playground examples={composingExamples} />
        </TokenSection>

        <PageNav />
      </View>
    </Page>
  );
}
