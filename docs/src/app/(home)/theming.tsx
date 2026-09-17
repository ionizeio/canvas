import { View, Text, Row, Column, ButtonGroup, useTheme } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../ui/page";
import { Section } from "../../ui/section";
import { H3, P, Rule, InlineCode } from "../../ui/prose";
import { PageNav } from "../../ui/page-nav";
import { CodeBlock } from "../../ui/code-block";
import { Callout } from "../../ui/tokens-kit";
import { sans } from "../../ui/fonts";
import { useDocsTheme } from "../../theme/docs-theme";

// The page's teaching snippets. The helper ones mirror src/theme.ts behavior
// exactly: the data-* attributes persist and broadcast a choice, no shipped CSS
// reads them, and only the .dark class restyles anything on its own.
const NATIVE_PROVIDER = `import { ThemeProvider } from "@ionizeio/canvas";

// Wrap the app once. ThemeProvider follows the OS appearance by default;
// pass the dark / light boolean to force a scheme, and glass for the material.
export function App() {
  return (
    <ThemeProvider dark glass>
      <Screens />
    </ThemeProvider>
  );
}`;
const USE_THEME = `import { useTheme } from "@ionizeio/canvas";

// Read the active theme anywhere under the provider.
const { scheme, surface, tokens, dark } = useTheme();
// scheme:  "light" | "dark"      surface: "solid" | "glass"
// tokens:  active color tokens   dark:    scheme === "dark"`;
const DARK_TOGGLE = `<!-- Light (default) -->
<html>

<!-- Dark -->
<html class="dark">`;
const JS_THEME = `import { getTheme, setTheme, toggleTheme } from "@ionizeio/canvas";

getTheme();        // "light" | "dark"
setTheme("dark");  // applies .dark to <html>, persists to localStorage
toggleTheme();     // switches and returns the new theme`;
const SYSTEM_PREF = `import { setTheme } from "@ionizeio/canvas";

// Web only. On native, ThemeProvider already follows the OS appearance.
const mq = window.matchMedia("(prefers-color-scheme: dark)");
setTheme(mq.matches ? "dark" : "light");
mq.addEventListener("change", (e) => setTheme(e.matches ? "dark" : "light"));`;
const GLASS = `import { ThemeProvider, getSurface } from "@ionizeio/canvas";

// Web: the same provider and the same booleans. getSurface() reads the choice
// setSurface() persisted (see the helpers below), so it survives a reload.
export function App() {
  const surface = getSurface(); // "solid" | "glass"
  return (
    <ThemeProvider glass={surface === "glass"} solid={surface === "solid"}>
      <Screens />
    </ThemeProvider>
  );
}`;
const JS_SURFACE = `import { getSurface, setSurface } from "@ionizeio/canvas";

getSurface();            // "solid" | "glass", the persisted choice
setSurface("glass");     // persists it, and sets data-surface="glass" on <html>
setSurface("solid");     // persists it, and removes the attribute

// No shipped CSS reads data-surface. The attribute is a broadcast hook for your
// own code: read the choice back and pass it to ThemeProvider, as above.`;
const DENSITY = `// Density is per component, on every platform; omit both for the default.
<Card compact>...</Card>
<Card comfortable>...</Card>
<DataTable compact columns={columns} rows={rows} />`;
const JS_DENSITY = `import { getDensity, setDensity } from "@ionizeio/canvas";

getDensity();            // "compact" | "regular" | "comfy", the persisted preference
setDensity("compact");   // persists it, and sets data-density="compact" on <html>
setDensity("regular");   // persists it, and removes the attribute

// No shipped CSS reads data-density. Store the app-wide preference here, then
// map it to component booleans (compact / comfortable) in your own code.`;
const COMBINING = `// One provider carries scheme and surface; density rides each component.
<ThemeProvider dark glass>
  <Card compact>...</Card>
</ThemeProvider>`;
const JS_COMBINE = `import { setTheme, setSurface, setDensity } from "@ionizeio/canvas";

setTheme("dark");       // flips .dark on <html>: the CSS token layer re-themes
setSurface("glass");    // persists; sync it into <ThemeProvider glass>
setDensity("compact");  // persists; map it to component booleans`;

function Bullet({ children }: { children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Row snug>
      <Text style={{ fontFamily: sans("400"), fontSize: 14, lineHeight: 24, color: tokens["muted-foreground"] }}>•</Text>
      <Text style={{ flex: 1, fontFamily: sans("400"), fontSize: 14, lineHeight: 24, color: tokens["muted-foreground"] }}>{children}</Text>
    </Row>
  );
}

export default function ThemingScreen() {
  const { scheme, surface, setScheme, setSurface } = useDocsTheme();

  return (
    <Page>
      <View style={{ gap: 28 }}>
        <PageHeader
          title="Theming"
          description="Three theming axes (light/dark, glass surface, density) on one model: ThemeProvider carries scheme and glass on every platform; on the web, the .dark class drives the CSS token layer and small helpers persist the rest."
        />

        <Section title="Native (ThemeProvider)">
          <P>
            On iOS and Android, wrap the app once in <InlineCode>ThemeProvider</InlineCode>. It follows the OS appearance by
            default; force a scheme with the <InlineCode>dark</InlineCode> / <InlineCode>light</InlineCode> boolean, and the
            material with <InlineCode>glass</InlineCode> / <InlineCode>solid</InlineCode>. Both axes are flat booleans like every
            Canvas axis: pass at most one per axis, omit both for the default (the OS appearance, the platform material). No CSS
            and no <InlineCode>{"<html>"}</InlineCode>{" "}
            attributes are involved on native.
          </P>
          <CodeBlock code={NATIVE_PROVIDER} />
          <P>Read the active theme anywhere under the provider with <InlineCode>useTheme()</InlineCode>.</P>
          <CodeBlock code={USE_THEME} />
          <Callout label="Density">
            is a per-component choice, not a provider prop: pass a density boolean to the components that support it (for example
            {" <Card compact> or <Card comfortable>"}). That holds on the web too; the setDensity helper below only persists a
            preference.
          </Callout>
          <Callout label="Server rendering (SSR/SSG)">
            When the app server-renders (Next.js and the like) and the client scheme can differ from the server default (a stored
            preference, the OS), also pass <InlineCode>ssrScheme</InlineCode> with the scheme the server resolves. The provider
            repeats it for the hydration render so the HTML matches, then applies the requested scheme after mount.
            Without it React keeps the server&apos;s inline colors on elements that never re-render, leaving components stuck in
            the server&apos;s scheme.
          </Callout>
        </Section>

        <Rule />

        <Section title="Light / Dark Mode">
          <P>
            Light mode is the default. On the web, dark mode is the <InlineCode>dark</InlineCode> class on <InlineCode>{"<html>"}</InlineCode>,
            the one attribute the shipped CSS reads for theming; the helpers toggle it and the token layer flips every color token for
            anything styled with the CSS variables. Mirror the class into <InlineCode>ThemeProvider</InlineCode>&apos;s{" "}
            <InlineCode>scheme</InlineCode> so the components follow (the Integration page shows the hook; the value form exists
            exactly for a held value like that). (On native, pass the{" "}
            <InlineCode>dark</InlineCode> / <InlineCode>light</InlineCode> boolean to <InlineCode>ThemeProvider</InlineCode> instead.)
          </P>
          <CodeBlock code={DARK_TOGGLE} />
          <Row flush>
            <ButtonGroup
              segmented
              small
              items={["Light", "Dark"]}
              active={scheme === "light" ? 0 : 1}
              onSelect={(i) => setScheme(i === 0 ? "light" : "dark")}
            />
          </Row>
          <H3>Web helpers</H3>
          <CodeBlock code={JS_THEME} />
          <H3>Respecting system preference</H3>
          <P muted>On the web the helpers do not auto-detect <InlineCode>prefers-color-scheme</InlineCode>. Wire it yourself:</P>
          <CodeBlock code={SYSTEM_PREF} />
        </Section>

        <Rule />

        <Section title="Glass Surface">
          <P>
            Glass is a layered model. Every surface renders through the same material, and each layer has its own under-fill so the
            stack stays legible: the functional layer (navbars, tab bars, the sidebar, dialogs, action sheets, drawers, popovers, the
            command palette) takes the sheer tint; the content layer (cards, lists, tables, calendars, charts, alerts) takes a denser
            one so its text keeps its contrast; the controls (fields, buttons, tabs, chips, badges, switches, checkboxes) are bright
            glass pucks, brand-tinted where their fill is the brand; and the surfaces you read and act on (dropdowns, selects, row
            menus, alert dialogs, toasts, tooltips) take the densest tint so nothing reads through their rows. It is a theming-level
            switch (the ThemeProvider turns on the material's own layer fills and rewrites no semantic token), not a per-component
            prop. Every surface renders through Canvas's GlassSurface primitive, which paints the real material per
            platform: Apple's native Liquid Glass on iOS 26+ (via expo-glass-effect), a real lens on Chromium browsers (an SVG
            displacement filter that refracts the backdrop at the rim, where the glass bends most; the centre stays optically flat), a
            genuine frosted blur on non-Chromium web and Android (via expo-blur), and a translucent fallback when no material is
            available. It defaults to the platform:{" "}
            glass on iOS 26+ (matching the OS) and solid everywhere else, when you pass neither boolean. Force it with <InlineCode>glass</InlineCode> /{" "}
            <InlineCode>solid</InlineCode> on <InlineCode>ThemeProvider</InlineCode>; that holds on the web too, where components read
            the surface from the provider, not from CSS.
          </P>
          <CodeBlock code={GLASS} />
          <Row flush>
            <ButtonGroup
              segmented
              small
              items={["Solid", "Glass"]}
              active={surface === "solid" ? 0 : 1}
              onSelect={(i) => setSurface(i === 0 ? "solid" : "glass")}
            />
          </Row>
          <H3>What changes</H3>
          <Column tight>
            <Bullet>Every surface renders the material via GlassSurface (or a GlassPane behind a node that owns its own interaction): native Liquid Glass on iOS 26+, an SVG displacement lens on Chromium web, a frosted blur elsewhere on web and on Android; the layer it belongs to sets how dense its tint is</Bullet>
            <Bullet>No semantic token changes: popover and card keep the same opaque values they carry in solid mode. Glass adds its own fills, glass-tint, glass-tint-content, glass-tint-control and glass-tint-dense, painted under the material by the surfaces of each layer</Bullet>
            <Bullet>A brand fill (a primary button, a checked switch, a selected tab) is brand-tinted glass kept as sheer as its ink's 4.5:1 allows; a hue wash (a status badge, a coloured chip) steps its label one deeper; fills inside a surface (a hovered row, a header band) become ink tints so they never sit as opaque patches on the material</Bullet>
            <Bullet>Surfaces drop their skin fill and hairline and the material paints its own white-alpha specular rim; a state border (a focus ring, an error edge) stays</Bullet>
            <Bullet>The page background does not change by itself; these docs mount the kit's Backdrop scene behind the shell in glass mode so the frost has something to refract, an app-level choice</Bullet>
          </Column>
          <H3>Web helpers</H3>
          <P muted>The helpers persist the choice; they restyle nothing by themselves. The provider, fed as above, is what re-themes the components.</P>
          <CodeBlock code={JS_SURFACE} />
        </Section>

        <Rule />

        <Section title="Density">
          <P>
            Density controls spacing in content areas and data tables, and it is a per-component choice on every platform: pass the{" "}
            <InlineCode>compact</InlineCode> or <InlineCode>comfortable</InlineCode> boolean to the components that support it (for
            example <InlineCode>Card</InlineCode> and <InlineCode>DataTable</InlineCode>). There is no app-wide density switch: no
            shipped CSS reads a density attribute, on the web or anywhere else.
          </P>
          <CodeBlock code={DENSITY} />
          <H3>Web helpers</H3>
          <P muted>
            The helpers persist an app-wide preference (compact, regular, comfy) and set <InlineCode>data-density</InlineCode> on{" "}
            <InlineCode>{"<html>"}</InlineCode>, which nothing in the shipped CSS reads. Read the stored value back and map it to
            component booleans yourself.
          </P>
          <CodeBlock code={JS_DENSITY} />
        </Section>

        <Rule />

        <Section title="Combining Axes">
          <P>
            All three axes are independent and composable. Scheme and surface are <InlineCode>ThemeProvider</InlineCode> props on
            every platform, with the web's <InlineCode>dark</InlineCode> class driving the CSS token layer alongside; density is per
            component. The web helpers persist all three choices, but only <InlineCode>setTheme</InlineCode> restyles anything by
            itself.
          </P>
          <CodeBlock code={COMBINING} />
          <CodeBlock code={JS_COMBINE} />
        </Section>

        <PageNav />
      </View>
    </Page>
  );
}
