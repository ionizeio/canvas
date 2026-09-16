import { ScrollView, View, Text, DataTable, useTheme } from "@nannier-com/canvas";
import { useRouter } from "expo-router";
import { Page, PageHeader } from "../../ui/page";
import { Section } from "../../ui/section";
import { P, InlineCode, Rule } from "../../ui/prose";
import { CodeBlock } from "../../ui/code-block";
import { DocsSurface } from "../../ui/surface";
import { PageNav } from "../../ui/page-nav";
import { MONO } from "../../ui/prose";
import { sans } from "../../ui/fonts";

// One row per re-exported primitive: the name (links to its reference page), the
// react-native component it IS, and what its style object controls.
const PRIMITIVES = [
  { name: "View", wraps: "View", to: "/components/view", styles: "The box: layout, background, border, radius. A flex container by default." },
  { name: "Text", wraps: "Text", to: "/components/text", styles: "The text run: color, fontSize, fontWeight, textAlign." },
  { name: "Pressable", wraps: "Pressable", to: "/components/pressable", styles: "A pressable surface; its style accepts ({ pressed }) => ... for press feedback." },
  { name: "TextInput", wraps: "TextInput", to: "/components/text-input", styles: "The raw field text and box. A low-level primitive (see below)." },
  { name: "ScrollView", wraps: "ScrollView", to: "/components/scroll-view", styles: "style is the scroll frame; contentContainerStyle is the content." },
];

// Things Canvas deliberately does NOT re-export, with the reason and the thing to
// reach for instead. Keeps the boundary explicit, not arbitrary.
const NOT_WRAPPED: string[][] = [
  ["FlatList / SectionList", "Virtualization; the styling surface is your renderItem cells.", "Import from react-native; build cells with View / Text."],
  ["Modal", "The inline Dialog / Popover / Tooltip render their open state in place; the Drawer wraps Modal for a real full-screen panel.", "Use Drawer for a full-screen panel, Dialog / Popover / Tooltip inline, or import Modal directly."],
  ["Animated, Animated.View", "Animation is a behavior driven by Animated.Value, not a static style.", "Build the style object from tokens and animate it on Animated.View (the Skeleton recipe)."],
  ["Dimensions", "useResponsive already reads useWindowDimensions for responsive values.", "Pick values with useResponsive, or import useWindowDimensions for raw numbers."],
  ["KeyboardAvoidingView / SafeAreaView / RefreshControl", "Behavior primitives whose value is platform behavior, not styling.", "Import from react-native (or react-native-safe-area-context)."],
];

const SCROLL_ROWS = ["Ada Lovelace", "Grace Hopper", "Kira Tanaka", "Liang Bao", "Marcus Allen", "Noor Park", "Rachel Chen"];

const SCROLL_CODE = `import { ScrollView, View, Text, useTheme } from "@nannier-com/canvas";

// style sizes the FRAME (give it a bounded height so it scrolls);
// contentContainerStyle styles the inner content (padding, gap, centering).
function List({ rows }) {
  const { tokens } = useTheme();
  return (
    <ScrollView
      style={{ maxHeight: 160, borderRadius: 6, borderWidth: 1, borderColor: tokens.border }}
      contentContainerStyle={{ padding: 12, gap: 8 }}
    >
      {rows.map((label) => (
        <View key={label} style={{ borderRadius: 6, backgroundColor: tokens.muted, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}`;

const TEXT_INPUT_CODE = `import { TextInput, useTheme } from "@nannier-com/canvas";

// Low-level primitive: no focus border and no react-native-web outline reset.
// Prefer the Input / Textarea COMPONENTS for real form fields. RN does not take
// the placeholder color through style, so pass placeholderTextColor directly.
function PinField() {
  const { tokens } = useTheme();
  return (
    <TextInput
      style={{
        width: "100%",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: tokens.input,
        backgroundColor: tokens.background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: tokens.foreground,
      }}
      placeholder="000000"
      placeholderTextColor={tokens["muted-foreground"]}
      keyboardType="number-pad"
    />
  );
}`;

const ESCAPE_CODE = `import { useTheme } from "@nannier-com/canvas";
import { FlatList } from "react-native";

// For any RN component Canvas does not ship, build the style object from tokens
// and pass it directly. The missing-wrapper case is never a dead end.
function Rows({ data }) {
  const { tokens } = useTheme();
  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={data}
      renderItem={({ item }) => <Row item={item} tokens={tokens} />}
    />
  );
}`;

// The primitives table: the Canvas DataTable, with the first column a primary
// monospace link to each name's reference page. ReactNode cells carry the link /
// monospace / muted styling inside the kit table's bordered, uppercase-header frame.
function PrimitivesTable() {
  const { tokens } = useTheme();
  const router = useRouter();
  return (
    <DocsSurface bordered>
      <DataTable
        columns={["Primitive", "Is (react-native)", "style controls"]}
        rows={PRIMITIVES.map((p) => [
          <Text
            key="name"
            onPress={() => router.push(p.to as never)}
            style={{ fontFamily: MONO, fontSize: 14, lineHeight: 20, color: tokens.primary }}
          >
            {p.name}
          </Text>,
          <Text key="wraps" style={{ fontFamily: MONO, fontSize: 14, lineHeight: 20, color: tokens.foreground }}>
            {p.wraps}
          </Text>,
          <Text key="styles" style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>
            {p.styles}
          </Text>,
        ])}
      />
    </DocsSurface>
  );
}

export default function RnPrimitivesScreen() {
  const { tokens } = useTheme();
  return (
    <Page>
      <View style={{ gap: 28 }}>
        <PageHeader
          title="React Native primitives"
          description="How Canvas builds on React Native, and the boundary between the Canvas components and raw react-native."
        />

        <Section title="Two layers, one rule">
          <P muted>
            Canvas ships semantic-prop components (Button, Input, Card) on top of React Native's own primitives (View,
            Text, Pressable, TextInput, ScrollView). Components carry flat boolean style props and style
            themselves; the primitives are the raw react-native components, which you style with a plain RN{" "}
            <InlineCode>style</InlineCode> object. The boolean-prop philosophy applies to components, not these low-level
            primitives.
          </P>
          <P muted>
            You build a primitive's style object from the brand tokens, read with <InlineCode>useTheme()</InlineCode> so
            colors follow light / dark and the glass surface, plus the <InlineCode>useResponsive</InlineCode>,{" "}
            <InlineCode>shadow</InlineCode>, and <InlineCode>alpha</InlineCode> helpers. There is no className layer and no
            build step: a style is a JS object, and <InlineCode>style={"{[a, b]}"}</InlineCode> merges left to right, so
            the last entry wins.
          </P>
        </Section>

        <Rule />

        <Section title="The primitives">
          <P muted>
            Canvas re-exports the five primitives you compose with most: <InlineCode>View</InlineCode>,{" "}
            <InlineCode>Text</InlineCode>, <InlineCode>Pressable</InlineCode>, <InlineCode>TextInput</InlineCode>,{" "}
            <InlineCode>ScrollView</InlineCode>. They are react-native's own
            components, re-exported for a single import alongside the components and helpers; importing them from{" "}
            <InlineCode>react-native</InlineCode> is equivalent. (<InlineCode>Image</InlineCode> is not among them: it is a Canvas
            atom that wraps RN's Image with boolean fit props, so it lives with the components.) Each name below links to its full
            reference page.
          </P>
          <PrimitivesTable />
        </Section>

        <Rule />

        <Section title="ScrollView: two style surfaces">
          <P muted>
            ScrollView has two style targets: <InlineCode>style</InlineCode> sizes the scroll frame (the clipped
            viewport: height, max-height, border) and <InlineCode>contentContainerStyle</InlineCode> styles the inner
            content (padding, gap, centering). The single most common mistake is putting padding on{" "}
            <InlineCode>style</InlineCode> instead of <InlineCode>contentContainerStyle</InlineCode>. On the web the frame
            needs a bounded height (a fixed/max height or a flex parent) to actually scroll.
          </P>
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 16 }}>
            <ScrollView
              style={{ maxHeight: 160, borderRadius: 6, borderWidth: 1, borderColor: tokens.border }}
              contentContainerStyle={{ padding: 12, gap: 8 }}
            >
              {SCROLL_ROWS.map((label) => (
                <View key={label} style={{ borderRadius: 6, backgroundColor: tokens.muted, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>{label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <CodeBlock code={SCROLL_CODE} />
        </Section>

        <Rule />

        <Section title="TextInput vs Input / Textarea">
          <P muted>
            <InlineCode>TextInput</InlineCode> is the low-level, style-it-yourself field. It does not include a focus
            border or the react-native-web focus-outline reset. Reach for the <InlineCode>Input</InlineCode> or{" "}
            <InlineCode>Textarea</InlineCode> components for a real form field with semantic props (
            <InlineCode>error</InlineCode>, <InlineCode>small</InlineCode>, <InlineCode>large</InlineCode>, addons, the
            outline reset, the focus border). Reach for <InlineCode>TextInput</InlineCode> only when building a field
            Canvas does not ship.
          </P>
          <CodeBlock code={TEXT_INPUT_CODE} />
        </Section>

        <Rule />

        <Section title="What Canvas does not wrap">
          <P muted>
            <InlineCode>react-native</InlineCode> and <InlineCode>react-native-svg</InlineCode> are peer dependencies,
            not bundled. Beyond the five primitives above, Canvas does not re-export raw react-native (that would
            duplicate the peer surface and risk version skew). Import these directly from{" "}
            <InlineCode>react-native</InlineCode>:
          </P>
          <DocsSurface bordered>
            <DataTable
              columns={["From react-native", "Why not wrapped", "Use instead"]}
              rows={NOT_WRAPPED.map(([from, why, use]) => [
                <Text key="from" style={{ fontFamily: MONO, fontSize: 14, lineHeight: 20, color: tokens.foreground }}>
                  {from}
                </Text>,
                why,
                use,
              ])}
            />
          </DocsSurface>
        </Section>

        <Rule />

        <Section title="Styling your own">
          <P muted>
            For any RN component Canvas does not ship, build the style object from tokens yourself and pass it as{" "}
            <InlineCode>style</InlineCode>. New visual variation belongs on a component's boolean props, not on new
            primitives; where a component takes a <InlineCode>style</InlineCode> prop it is outer layout composition only
            (a width, a flex within a parent), never a restyle or re-spacing hook. Arrangement belongs to the{" "}
            <InlineCode>Row</InlineCode> / <InlineCode>Column</InlineCode> layout atoms.
          </P>
          <CodeBlock code={ESCAPE_CODE} />
        </Section>

        <PageNav />
      </View>
    </Page>
  );
}
