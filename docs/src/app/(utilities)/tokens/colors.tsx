import {
  View,
  Text,
  alpha,
  useTheme,
  colorsByScheme,
  palette,
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
  Grid, useResponsive } from "@ionizeio/canvas";
import { Page } from "../../../ui/page";
import { PageNav } from "../../../ui/page-nav";
import { CodeBlock } from "../../../ui/code-block";
import { DoDontCard } from "../../../ui/dont";
import { colorFormats } from "../../../ui/color";
import { TokenH1, TokenLede, TokenSection, Callout, GradientFill } from "../../../ui/tokens-kit";

// Every value on this page is read from the kit at render time (useTheme,
// colorsByScheme, palette, the active glass tints). Nothing is restated here:
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
  { key: "action", name: "action" },
  { key: "action-foreground", name: "action-foreground" },
];

const NEUTRAL_KEYS: { key: keyof ColorTokens; name: string }[] = [
  { key: "background", name: "background" },
  { key: "card", name: "card" },
  { key: "muted", name: "muted" },
  { key: "border", name: "border" },
  // The text field's resting hairline: the one neutral that sits below the 3:1
  // control floor on purpose (Dark Factory's field line, densified to stand apart
  // from border). Every other control edge is input, which holds the floor.
  { key: "field-border", name: "field-border" },
  { key: "input", name: "input" },
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

// The translucent roles: washes, the field fill, the modal scrim, the shadow tint and
// the inverse surface. Optional in a custom token map, so a sample only renders when
// the active map carries the role.
const OVERLAY_KEYS: (keyof ColorTokens)[] = [
  "primary-soft",
  "success-soft",
  "warning-soft",
  "destructive-soft",
  "field-fill",
  "scrim",
  "shade",
  "inverse",
  "inverse-foreground",
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

// The default accent, read from the kit, then five curated alternatives as real
// palette steps rather than approximate HSL; see the section's note on what moves.
const ACCENTS: { name: string; color: string }[] = [
  { name: "Violet (default)", color: colorsByScheme.light.primary },
  { name: "Indigo", color: palette["indigo-600"] },
  { name: "Teal", color: palette["teal-600"] },
  { name: "Rose", color: palette["rose-500"] },
  { name: "Amber", color: palette["amber-500"] },
  { name: "Slate", color: palette["slate-600"] },
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

tokens.primary; // Selection: "${colorsByScheme.light.primary}" light, "${colorsByScheme.dark.primary}" dark
tokens.action ?? tokens.primary; // Call to action, including legacy token maps
tokens["primary-text"] ?? tokens.primary; // Brand text, including legacy token maps
tokens["destructive-text"] ?? tokens.destructive; // Error text, including legacy token maps`;

const DYNAMIC = `<Button primary>Save</Button>

// You set the look with a prop, never a class. The skin
// builds { backgroundColor: tokens.action }, so one prop
// resolves live per theme:
//   light       → ${colorsByScheme.light.action}
//   dark        → ${colorsByScheme.dark.action}
//   teal accent → #0d9488 (a primary-only override
//                 repaints action too)`;

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

// Optional text roles fall back for legacy complete token objects; the translucent
// roles have no single fallback color, so they read undefined when a map omits them.
function colorValue(tokens: ColorTokens, key: keyof ColorTokens): string | undefined {
  if (key === "primary-text") return tokens[key] ?? tokens.primary;
  if (key === "destructive-text") return tokens[key] ?? tokens.destructive;
  if (key === "field-border") return tokens[key] ?? tokens.input;
  if (key === "action") return tokens[key] ?? tokens.primary;
  if (key === "action-foreground") return tokens[key] ?? tokens["primary-foreground"];
  return tokens[key];
}

/** The samples for a list of roles, skipping any role the active map does not carry. */
function samples(tokens: ColorTokens, keys: { key: keyof ColorTokens; name: string }[]) {
  return keys.map(({ key, name }) => {
    const color = colorValue(tokens, key);
    return color ? <Sample key={key} color={color} name={name} /> : null;
  });
}

export default function ColorsScreen() {
  const { tokens, glass } = useTheme();
  // Two columns above md (768), by the kit's viewport bucket (desktop on the server).
  const wide = useResponsive({ base: true, md: false });

  // The reference table carries both schemes in both notations, which is where the
  // density belongs once the samples above are calm.
  const referenceRows = (Object.keys(colorsByScheme.light) as (keyof ColorTokens)[]).sort().flatMap((key) => {
    const light = colorValue(colorsByScheme.light, key);
    const darkValue = colorValue(colorsByScheme.dark, key);
    if (!light || !darkValue) return [];
    return [[
      `--${key}`,
      light,
      colorFormats(light)[2],
      darkValue,
      colorFormats(darkValue)[2],
    ]];
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
          description="Two brand colors with different jobs. primary is the selection color: checked, selected and current states, links and focus. action is the call to action: primary buttons, meters and count badges. Each has a partner for the label on its fill, and primary-text colors links, text actions and focused Android field labels on neutral surfaces."
          anatomy="ring is Dark Factory's violet as drawn, so the focus outline holds 3:1 on the page, the card and the muted surfaces. primary is the same hue solved until its label clears 4.5:1, which puts it a step darker than the ring in light."
        >
          <Grid minTileWidth={150} cozy>
            {samples(tokens, BRAND_KEYS)}
            {/* The one place the sheet shows the other scheme outright, because the
                light/dark difference IS the point for the accent. */}
            <Sample color={colorsByScheme.dark.primary} name="primary (dark)" />
          </Grid>
          <Typography primary small>Brand text uses primary-text.</Typography>
        </TokenSection>

        <TokenSection
          title="Neutrals"
          description="Dark Factory's lavender-tinted surfaces, hairlines and indigo-gray inks that everything else sits on."
          anatomy="The surfaces and the inks share one hue family, so hierarchy comes from lightness rather than from a change of hue. background is the frosted page, card the white pane on it (a deep indigo in dark), and muted the quieter panel inside a card."
        >
          <Grid minTileWidth={150} cozy>
            {samples(tokens, NEUTRAL_KEYS)}
          </Grid>
        </TokenSection>

        <TokenSection
          title="Semantic"
          description="The meaning-bearing tones. Fill tokens have paired foregrounds for their labels; destructive-text supplies readable error and destructive text on neutral surfaces."
          anatomy="Use destructive-foreground on a destructive fill, and destructive-text for error text and semantic destructive actions. The default text role also accounts for the kit's tonal capsules and enabled pressed states."
        >
          <Grid minTileWidth={150} cozy>
            {samples(tokens, SEMANTIC_KEYS)}
          </Grid>
          <Typography destructive small>Destructive text uses destructive-text.</Typography>
        </TokenSection>

        <TokenSection
          title="Washes and overlays"
          description="The translucent roles: the soft washes behind a toned badge, an alert band or a tonal selection, the field fill, the scrim that dims the page behind a modal, the shadow tint, and the inverse surface of a tooltip or a snackbar."
          anatomy="Each is optional in a custom token map. scrim is the one every modal reads today; the rest are adopted skin by skin, and a map that omits a role keeps that skin's older recipe."
        >
          <Grid minTileWidth={150} cozy>
            {samples(tokens, OVERLAY_KEYS.map((key) => ({ key, name: key })))}
          </Grid>
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
            {samples(tokens, CHART_KEYS.map((key) => ({ key, name: key })))}
          </Grid>
        </TokenSection>

        <TokenSection
          title="Glass"
          description="Glass is a theming-level surface mode, not a per-component prop: pass glass on the ThemeProvider and every surface takes the material together, layered, or solid to force the flat look; neither means the platform default."
          anatomy={`Glass publishes its OWN fills instead of rewriting a semantic one, one per layer of the model, and each platform has its own set. Here, in the active scheme: the functional shells paint glass-tint (${glass["glass-tint"]}), the content panes the denser glass-tint-content (${glass["glass-tint-content"]}), the controls the glass-tint-control puck (${glass["glass-tint-control"]}), and the read-and-act surfaces (menus, alert dialogs, toasts, tooltips) the densest glass-tint-dense (${glass["glass-tint-dense"]}). The web's are Dark Factory's frost tints; iOS and Android keep their own (glassByScheme). popover and card keep their opaque values in BOTH schemes, so solid mode is untouched and the fills stay independent; every surface takes its tint UNDER the real material.`}
        >
          <Column cozy>
            {/* A live material sample: the bar floats over content, which is the only
                condition under which glass reads as glass at all. */}
            {/* Docs illustration, not a reusable control: a plate of stand-in content
                with a bar floating over it. Built from the raw primitives on purpose,
                and every colour still comes from a token (primary-foreground is the
                kit's "text on a saturated fill"), never a literal. */}
            <GradientFill colors={[colorsByScheme.light.primary, colorsByScheme.light["chart-2"]]} height={236}>
              {/* A dark scrim over the violet-to-teal wash: the material has to bend something,
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
              GlassSurface paints the real material per platform: Apple's Liquid Glass through expo-glass-effect on iOS 26+, Dark Factory's plain frost on the web (the layer's tint over a 24px backdrop blur, edged by a 1px hairline, with no refraction and no highlight), a genuine frosted blur through expo-blur on Android and older iOS, and the glass-tint fill above on its own as the final fallback. It is never a hand-painted blur on one component, and it never reaches into the semantic color set.
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
          description="The default accent is Dark Factory's violet. These palette steps are starting points for a custom brand. Check your filled controls and text against their actual backgrounds in both schemes."
          anatomy="ThemeProvider carries a primary-only override into primary-text and into action, so links and the call-to-action buttons follow a one-color rebrand. Supply primary-text for a different text shade, and action with action-foreground to keep a distinct call-to-action color. primary-foreground remains the label on the primary fill; it is not recalculated."
        >
          <Grid minTileWidth={150} cozy>
            {ACCENTS.map((a) => (
              <Sample key={a.name} color={a.color} name={a.name} />
            ))}
          </Grid>
          <Typography small muted>
            CSS hand-off rebrands set --primary, --primary-text and --action (with --action-foreground). Setting --primary-text: var(--primary) and --action: var(--primary) at the override scope gives the single-color behavior. CSS does not apply the ThemeProvider override cascade.
          </Typography>
          <Typography small muted>
            The same override rule applies to destructive and destructive-text. ThemeProvider uses a destructive-only override for semantic error text too; supply destructive-text separately for a readable text shade. CSS consumers set --destructive-text explicitly, or use --destructive-text: var(--destructive) for the previous behavior. Menus with a documented fixed red palette retain their independent colors. Check custom colors against their actual resting and pressed surfaces.
          </Typography>
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
                  The primary prop is the whole styling API; the button reads tokens.action from useTheme(). Switch the scheme or point the accent at a new hue and the ThemeProvider swaps the token set, so every component bound to it re-renders with the new colour.
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
