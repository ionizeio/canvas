import { useWindowDimensions } from "react-native";
import {
  View,
  Text,
  alpha,
  useTheme,
  colorsByScheme,
  glassByScheme,
  palette,
  brandColors,
  statusHues,
  Swatch,
  Row,
  Column,
  Card,
  Alert,
  Badge,
  DataTable,
  GlassSurface,
  Typography,
  type ColorTokens,
  type StatusTone,
  Grid,
} from "@ionizeio/canvas";
import { Page } from "../../../ui/page";
import { PageNav } from "../../../ui/page-nav";
import { CodeBlock } from "../../../ui/code-block";
import { DoDontCard } from "../../../ui/dont";
import { colorFormats } from "../../../ui/color";
import { TokenH1, TokenLede, TokenSection, Callout, GradientFill } from "../../../ui/tokens-kit";

// Every value on this page is read from the kit at render time (useTheme,
// colorsByScheme, glassByScheme, palette, brandColors). Nothing is restated here:
// a hard-coded table is how this page used to end up publishing a five-color chart
// palette the kit stopped shipping.

// The swatch groups, mirroring the design system's own color sheet: brand, then
// neutrals, then the semantic tones. Each entry is a token key plus the label the
// sheet gives it.
const BRAND_KEYS: { key: keyof ColorTokens; name: string }[] = [
  { key: "primary", name: "primary" },
  { key: "primary-foreground", name: "primary-foreground" },
  { key: "primary-text", name: "primary-text" },
  { key: "ring", name: "ring" },
];

const NEUTRAL_KEYS: { key: keyof ColorTokens; name: string }[] = [
  { key: "background", name: "background" },
  { key: "card", name: "card" },
  { key: "muted", name: "muted" },
  // border and input carry the same value in both schemes, so the sheet samples
  // them once rather than shipping two identical chips.
  { key: "border", name: "border / input" },
  // The iOS field's resting hairline: the one neutral that sits below the 3:1
  // control floor on purpose (the iOS input-field reference's gray-300).
  { key: "field-border", name: "field-border" },
  { key: "muted-foreground", name: "muted-foreground" },
  { key: "foreground", name: "foreground" },
];

const SEMANTIC_KEYS: { key: keyof ColorTokens; name: string }[] = [
  { key: "destructive", name: "destructive" },
  { key: "destructive-text", name: "destructive-text" },
  { key: "success", name: "success" },
  { key: "warning", name: "warning" },
  { key: "secondary", name: "secondary" },
  { key: "accent", name: "accent" },
];

const CHART_KEYS: (keyof ColorTokens)[] = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
];

// The six curated accents, as real palette steps rather than approximate HSL. Only
// primary and ring move; see the section's note.
const ACCENTS: { name: string; step: string }[] = [
  { name: "Indigo (default)", step: "indigo-600" },
  { name: "Violet", step: "violet-500" },
  { name: "Teal", step: "teal-600" },
  { name: "Rose", step: "rose-500" },
  { name: "Amber", step: "amber-500" },
  { name: "Slate", step: "slate-600" },
];

const TOKENS_SRC = `// tokens.ts: plain values for every platform
export const lightColors = {
  primary: "${colorsByScheme.light.primary}",
  "primary-text": "${colorsByScheme.light["primary-text"]}",
  "destructive-text": "${colorsByScheme.light["destructive-text"]}",
  background: "${colorsByScheme.light.background}",
  // …
};
export const darkColors = {
  primary: "${colorsByScheme.dark.primary}",
  "primary-text": "${colorsByScheme.dark["primary-text"]}",
  "destructive-text": "${colorsByScheme.dark["destructive-text"]}",
  background: "${colorsByScheme.dark.background}",
  // …
};`;

const THEME_RUNTIME = `// ThemeProvider supplies the active scheme;
// components read it through useTheme().
const { tokens } = useTheme();

tokens.primary; // Fill: "${colorsByScheme.light.primary}" light, "${colorsByScheme.dark.primary}" dark
tokens["primary-text"] ?? tokens.primary; // Brand text, including legacy token maps
tokens["destructive-text"] ?? tokens.destructive; // Error text, including legacy token maps`;

const DYNAMIC = `<Button primary>Save</Button>

// You set the look with a prop, never a class. The skin
// builds { backgroundColor: tokens.primary }, so one prop
// resolves live per theme:
//   light       → ${colorsByScheme.light.primary}
//   dark        → ${colorsByScheme.dark.primary}
//   teal accent → #0d9488`;

// Do / don't pairs, each grounded in a Canvas principle (semantic prop styling,
// paired foregrounds, useTheme-routed values, glass as a surface mode). These are
// deliberately non-compiling fences: the Don'ts show props the kit does not have,
// which is exactly why they are Don'ts, so they render as code rather than as a
// live preview.
// Each pair keeps ONE subject on both sides, so the Do is the correction of the
// exact mistake the Don't shows, never an answer to a different question.
const DO_DONT: { bad: { code: string; note: string }; good: { code: string; note: string } }[] = [
  {
    bad: { code: `<Button style={{ backgroundColor: "#6366f1" }}>\n  Save\n</Button>`, note: "A hard-coded fill painted over the component. It bypasses the theme: an accent change won't reach it, and it looks wrong in dark mode." },
    good: { code: `<Button primary>Save</Button>`, note: "The same button, styled by its semantic prop. The prop resolves through the active scheme's tokens, so theme and accent changes are free." },
  },
  {
    bad: { code: `<Button variant="primary" size="lg">`, note: "String-valued enum props are rejected on components: variant, size, and tone are not part of the API." },
    good: { code: `<Button primary large>`, note: "Flat boolean props, at most one per axis. The prop name is the value." },
  },
  {
    bad: { code: `backgroundColor: tokens.primary,\ncolor: tokens.foreground`, note: "In a skin's style object, foreground is the body-text color, not the partner of a primary fill: this pairing is not contrast-guaranteed." },
    good: { code: `backgroundColor: tokens.primary,\ncolor: tokens["primary-foreground"]`, note: "Every fill token has a -foreground partner. Pair them and contrast holds in both schemes." },
  },
  {
    bad: { code: `import { darkColors } from "@ionizeio/canvas"\nconst bg = darkColors.primary`, note: "Frozen to one scheme: this value never updates when the theme flips." },
    good: { code: `const { tokens } = useTheme()\nconst bg = tokens.primary`, note: "Reads the active scheme and re-renders when the theme changes." },
  },
  {
    bad: { code: `<Popover glass>`, note: "Glass is not a per-component prop, and you never hand-paint a blur onto one component." },
    good: { code: `<ThemeProvider glass>`, note: "Glass is a surface mode set once on the provider, so every surface that takes the material turns together. Same boolean grammar as every component axis: glass or solid, and omitting both keeps the platform default." },
  },
];

/** The two notations the sheet prints under a sample: the hex a call site types, and its oklch. */
function notations(hex: string): { value: string; detail: string } {
  return { value: hex, detail: colorFormats(hex)[2] };
}

/** One sample tile; the enclosing Grid fits as many as the row allows. */
function Sample({ color, name }: { color: string; name: string }) {
  const { value, detail } = notations(color);
  return (
    <Swatch block color={color} value={value} detail={detail}>
      {name}
    </Swatch>
  );
}

/** The ramp a status tone is built from, named rather than restated. */
function ramp(tone: StatusTone): string {
  return `${statusHues[tone]}-50 / 200 / 500 / 700`;
}

// Optional text roles fall back for legacy complete token objects.
function colorValue(tokens: ColorTokens, key: keyof ColorTokens): string {
  if (key === "primary-text") return tokens[key] ?? tokens.primary;
  if (key === "destructive-text") return tokens[key] ?? tokens.destructive;
  if (key === "field-border") return tokens[key] ?? tokens.input;
  return tokens[key];
}

export default function ColorsScreen() {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  // The reference table carries both schemes in both notations, which is where the
  // density belongs once the samples above are calm.
  const referenceRows = (Object.keys(colorsByScheme.light) as (keyof ColorTokens)[]).sort().map((key) => {
    const light = colorValue(colorsByScheme.light, key);
    const darkValue = colorValue(colorsByScheme.dark, key);
    return [
      `--${key}`,
      light,
      colorFormats(light)[2],
      darkValue,
      colorFormats(darkValue)[2],
    ];
  });

  return (
    <Page>
      <View style={{ gap: 40 }}>
        {/* Intro */}
        <Column cozy>
          <TokenH1>Colors & Theme</TokenH1>
          <TokenLede>
            Canvas uses a semantic token system. Every color is a named token (primary, muted-foreground, border, …) that ships as a plain value per scheme. Components read the active set through useTheme() and build their React Native styles from it, so the same code themes correctly on iOS, Android, and the web, with no per-platform fork. You never touch the values directly: you pick a component's look with semantic boolean props.
          </TokenLede>
          <Callout label="Try this.">Toggle the theme. Every sample below reads the active scheme live, so the values change with it.</Callout>
        </Column>

        <TokenSection
          title="Brand"
          description="The brand has separate colors for filled controls, labels on those fills, and text on neutral surfaces. primary-text colors links, text actions, and focused Android field labels."
          anatomy="ring is the one brand token that does NOT flip with the scheme: the same indigo-500 in light and dark, so the focus outline reads against a light page, a dark page, and the primary fill it may sit on."
        >
          <Grid minTileWidth={150} cozy>
            {BRAND_KEYS.map((t) => (
              <Sample key={t.key} color={colorValue(tokens, t.key)} name={t.name} />
            ))}
            {/* The one place the sheet shows the other scheme outright, because the
                light/dark difference IS the point for the accent. */}
            <Sample color={colorsByScheme.dark.primary} name="primary (dark)" />
          </Grid>
          <Typography primary small>Brand text uses primary-text.</Typography>
        </TokenSection>

        <TokenSection
          title="Neutrals"
          description="The zinc-based surfaces, hairlines, and text greys everything else sits on."
          anatomy="background and card are the same white in light mode, and foreground is near-black on both: the hairline border is what keeps those samples visible at all."
        >
          <Grid minTileWidth={150} cozy>
            {NEUTRAL_KEYS.map((t) => (
              <Sample key={t.key} color={colorValue(tokens, t.key)} name={t.name} />
            ))}
          </Grid>
        </TokenSection>

        <TokenSection
          title="Semantic"
          description="The meaning-bearing tones. Fill tokens have paired foregrounds for their labels; destructive-text supplies readable error and destructive text on neutral surfaces."
          anatomy="Use destructive-foreground on a destructive fill, and destructive-text for error text and semantic destructive actions. The default text role also accounts for the kit's tonal capsules and enabled pressed states."
        >
          <Grid minTileWidth={150} cozy>
            {SEMANTIC_KEYS.map((t) => (
              <Sample key={t.key} color={colorValue(tokens, t.key)} name={t.name} />
            ))}
          </Grid>
          <Typography destructive small>Destructive text uses destructive-text.</Typography>
        </TokenSection>

        <TokenSection
          title="Status surfaces"
          description="The tinted surfaces behind alerts and status badges. Each tone is one hue family sampled at four steps: a 50 fill, a 200 border, a 500 dot, and a 700 label."
          anatomy="Alert and Badge read the same tone-to-hue map (statusHues), so a warning banner and a warning pill in one view are guaranteed to be the same amber."
        >
          <Column relaxed>
            <Grid minTileWidth={210} cozy>
              <Alert success title="success" description={ramp("success")} icon={<Badge status success accessibilityLabel="success" />} />
              <Alert warning title="warning" description={ramp("warning")} icon={<Badge status warning accessibilityLabel="warning" />} />
              <Alert error title="error" description={ramp("error")} icon={<Badge status error accessibilityLabel="error" />} />
              <Alert info title="info" description={ramp("info")} icon={<Badge status info accessibilityLabel="info" />} />
            </Grid>
            <Row wrap snug alignCenter>
              <Badge status success>Active</Badge>
              <Badge status warning>Pending</Badge>
              <Badge status error>Failed</Badge>
              <Badge status info>Info</Badge>
              <Badge status neutral>Inactive</Badge>
            </Row>
          </Column>
        </TokenSection>

        <TokenSection
          title="Data-viz series"
          description="Eight colors for charts, assigned in a fixed order and never re-ranked. Distinct enough at 1-2px marks, with no two adjacent hues vibrating."
          anatomy="The series is identical in light and dark on purpose: the set was validated against both card surfaces, so a chart keeps its colour identity when the scheme flips."
        >
          <Grid minTileWidth={200} cozy>
            {CHART_KEYS.map((key) => (
              <Sample key={key} color={colorValue(tokens, key)} name={key} />
            ))}
          </Grid>
        </TokenSection>

        <TokenSection
          title="Glass"
          description="Glass is a theming-level surface mode, not a per-component prop: pass glass on the ThemeProvider and every surface takes the material together, layered, or solid to force the flat look; neither means the platform default."
          anatomy={`Glass publishes its OWN fills instead of rewriting a semantic one, one per layer of the model: the functional shells paint glass-tint (${glassByScheme.light["glass-tint"]} in light, ${glassByScheme.dark["glass-tint"]} in dark), the content panes the denser glass-tint-content (${glassByScheme.light["glass-tint-content"]} / ${glassByScheme.dark["glass-tint-content"]}), the controls the bright glass-tint-control puck (${glassByScheme.light["glass-tint-control"]} / ${glassByScheme.dark["glass-tint-control"]}), and the read-and-act surfaces (menus, alert dialogs, toasts, tooltips) the densest glass-tint-dense (${glassByScheme.light["glass-tint-dense"]} / ${glassByScheme.dark["glass-tint-dense"]}). popover and card keep their opaque values in BOTH schemes, so solid mode is untouched and the fills stay independent; every surface takes its tint UNDER the real material.`}
        >
          <Column cozy>
            {/* A live material sample: the bar floats over content, which is the only
                condition under which glass reads as glass at all. */}
            {/* Docs illustration, not a reusable control: a plate of stand-in content
                with a bar floating over it. Built from the raw primitives on purpose,
                and every colour still comes from a token (primary-foreground is the
                kit's "text on a saturated fill"), never a literal. */}
            <GradientFill colors={[brandColors["orb-indigo"], brandColors["orb-cyan"]]} height={236}>
              {/* A dark scrim over the orb wash: the material has to bend something,
                  and it reads on a deep backdrop the way the design system's own
                  glass sheet shows it. */}
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: alpha(palette["zinc-950"], 0.55) }} />
              {/* Stand-in content, run the full height so it passes BEHIND the bar.
                  A glass bar with nothing behind it renders flat, which is the one
                  thing this card must not demonstrate. */}
              <View style={{ position: "absolute", left: 22, right: 22, top: 18, gap: 7 }}>
                {[100, 72, 88, 54, 96, 66, 100, 78, 90, 58, 94, 70].map((w, i) => (
                  <View key={i} style={{ height: 9, width: `${w}%`, borderRadius: 5, backgroundColor: alpha(tokens["primary-foreground"], 0.34) }} />
                ))}
              </View>
              {/* No backgroundColor here on purpose: GlassSurface paints its own
                  under-fill (the glass-tint token, the material's own fill, never a
                  semantic surface token) behind the frost and the specular rim.
                  Passing a fill stacks an opaque layer over the material and
                  flattens it, which is exactly what this card exists to show. */}
              {/* `sheer`: the see-through frost for content that floats over a live
                  backdrop. The default frost is tuned for functional overlays, which
                  must occlude what they open over; a showcase bar must do the
                  opposite and let the content read through the material. */}
              <GlassSurface sheer style={{ position: "absolute", left: 16, right: 16, bottom: 14, height: 56, borderRadius: 9999, flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
                {/* The bar is a functional-layer overlay, so its labels take
                    popover-foreground, the text partner of the overlay surface: the
                    pair flips together with the scheme, which is the rule this page
                    teaches two sections down. */}
                {["Home", "Library", "Settings"].map((label) => (
                  <Text key={label} style={{ fontSize: 13, lineHeight: 18, color: tokens["popover-foreground"] }}>{label}</Text>
                ))}
              </GlassSurface>
            </GradientFill>
            <Typography tiny muted>
              Glass is layered. Navigation and overlays float in the sheer functional layer; the content panes beneath them take a denser tint so text keeps its contrast; the controls on those panes are bright pucks, brand-tinted where their fill is the brand; and the surfaces you read and act on (a menu, an alert, a toast) take the densest tint so nothing reads through their rows. Each layer bends the one beneath it.
            </Typography>
            <Typography tiny muted>
              GlassSurface paints the real material per platform: Apple's Liquid Glass through expo-glass-effect on iOS 26+, a real lens on Chromium web (an SVG displacement filter that refracts the backdrop at the rim while the centre stays optically flat), a genuine frosted blur through expo-blur on non-Chromium web and Android, and the glass-tint fill above on its own as the final fallback. It is never a hand-painted blur on one component, and it never reaches into the semantic color set.
            </Typography>
            <Typography tiny muted>
              It only reads over something worth bending. Over a flat fill it renders flat, so a glass bar has to have content passing behind it.
            </Typography>
            <Typography tiny muted>
              Fills inside a surface (a hovered row, a header band, a code pill) become ink tints under glass so they never sit as opaque patches on the material, and the inverse surfaces (a tooltip bubble, the Material snackbar) tint with the ink at the dense alpha so their inverse text keeps its contrast. Under Reduce Transparency or Increase Contrast every layer degrades to its opaque token.
            </Typography>
          </Column>
        </TokenSection>

        <TokenSection
          title="Rebranding the accent"
          description="The default accent is Indigo. These palette steps are starting points for a custom brand. Check your filled controls and text against their actual backgrounds in both schemes."
          anatomy="ThemeProvider preserves an existing primary-only override by using it for primary-text too. Supply primary-text separately when links or text actions need a different shade. primary-foreground remains the label on the primary fill; it is not recalculated."
        >
          <Grid minTileWidth={150} cozy>
            {ACCENTS.map((a) => (
              <Sample key={a.step} color={palette[a.step]} name={a.name} />
            ))}
          </Grid>
          <Typography small muted>
            CSS hand-off rebrands set both --primary and --primary-text. Setting --primary-text: var(--primary) at the override scope retains the previous single-color behavior. CSS does not apply the ThemeProvider override cascade.
          </Typography>
          <Typography small muted>
            The same override rule applies to destructive and destructive-text. ThemeProvider uses a destructive-only override for semantic error text too; supply destructive-text separately for a readable text shade. CSS consumers set --destructive-text explicitly, or use --destructive-text: var(--destructive) for the previous behavior. Menus with a documented fixed red palette retain their independent colors. Check custom colors against their actual resting and pressed surfaces.
          </Typography>
        </TokenSection>

        <TokenSection
          title="Brand constants"
          description="Fixed brand colors that do not flip with the scheme. Never used as component fills: they carry the sign-in orbs and the avatar gradient, which runs orb-indigo to orb-violet."
        >
          {/* The gradient is a two-token composition, not a colour, so it is described
              by the section rather than dressed up as a fourth sample: hand-building a
              block with a label column beside it is the exact anatomy Swatch's own
              Don't fence forbids. */}
          <Grid minTileWidth={150} cozy>
            {(Object.keys(brandColors) as (keyof typeof brandColors)[]).map((key) => (
              <Sample key={key} color={brandColors[key]} name={key} />
            ))}
          </Grid>
        </TokenSection>

        <TokenSection
          title="Full token reference"
          description="Every color token the kit ships, in both schemes and both notations. The hex is what a React Native call site reads; the oklch is what the web token layer publishes."
          anatomy="The two notations describe the same colour. For the saturated accents the CSS carries a wider-gamut chroma than an sRGB hex can express, so on a P3 display the web layer is the more saturated of the two."
        >
          <DataTable
            bordered
            striped
            columns={["Token", "Light", "Light oklch", "Dark", "Dark oklch"]}
            rows={referenceRows}
          />
        </TokenSection>

        <TokenSection
          title="How theming works"
          description="You change a component's look with semantic boolean props. Each one resolves through the active scheme's tokens, so the same markup renders correctly in every theme and accent, with no re-skinning and no per-call overrides."
        >
          <Column relaxed>
            <Grid minTileWidth={320} relaxed>
              <Card title="1 · Tokens (tokens.ts)">
                <CodeBlock code={TOKENS_SRC} />
              </Card>
              <Card title="2 · The theme runtime (useTheme)">
                <CodeBlock code={THEME_RUNTIME} />
              </Card>
            </Grid>
            <Card title="3 · One prop, resolved live">
              <Column cozy>
                <CodeBlock code={DYNAMIC} />
                <Typography small muted>
                  The primary prop is the whole styling API; the button reads tokens.primary from useTheme(). Switch the scheme or point the accent at a new hue and the ThemeProvider swaps the token set, so every component bound to it re-renders with the new colour.
                </Typography>
              </Column>
            </Card>
          </Column>
        </TokenSection>

        <TokenSection
          title="Do's and don'ts"
          description="Keep colour theme-routed. These are the patterns that follow the accent and dark mode for free, beside the ones that quietly break them."
        >
          <Column relaxed>
            {DO_DONT.map((pair, i) => (
              <View key={i} style={{ flexDirection: wide ? "row" : "column", gap: 16 }}>
                <DoDontCard dont caption={pair.bad.note} code={pair.bad.code} style={wide ? { flex: 1 } : null} />
                <DoDontCard do caption={pair.good.note} code={pair.good.code} style={wide ? { flex: 1 } : null} />
              </View>
            ))}
          </Column>
        </TokenSection>

        <PageNav />
      </View>
    </Page>
  );
}
