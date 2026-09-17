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
// exactly: the CSS handoff reads .dark and data-* attributes. React Native
// components receive the same choices through their provider and semantic props.
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

// The CSS handoff reads data-surface for the material mode and page backdrop.
// Also pass the choice to ThemeProvider so React Native components follow it.`;
const DENSITY = `// Density is per component, on every platform; omit both for the default.
<Card compact>...</Card>
<Card comfortable>...</Card>
<DataTable compact columns={columns} rows={rows} />`;
const JS_DENSITY = `import { getDensity, setDensity } from "@ionizeio/canvas";

getDensity();            // "compact" | "regular" | "comfy", the persisted preference
setDensity("compact");   // persists it, and sets data-density="compact" on <html>
setDensity("regular");   // persists it, and removes the attribute

// The CSS handoff adjusts supported card and table spacing tokens. Map the
// preference to component booleans (compact / comfortable) for React Native.`;
const COMBINING = `// One provider carries scheme and surface; density rides each component.
<ThemeProvider dark glass>
  <Card compact>...</Card>
</ThemeProvider>`;
const JS_COMBINE = `import { setTheme, setSurface, setDensity } from "@ionizeio/canvas";

setTheme("dark");       // flips .dark on <html>: the CSS token layer re-themes
setSurface("glass");    // updates CSS handoff; also sync into ThemeProvider
setDensity("compact");  // updates CSS spacing; also map to component booleans`;

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
          description="Three theming axes (light/dark, glass surface, density) on one model: ThemeProvider carries scheme and glass on every platform; on the web, helpers persist all three choices and update the CSS handoff attributes."
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
            {" <Card compact> or <Card comfortable>"}). That holds for React Native Web components too; the setDensity helper
            also updates spacing tokens in the separate CSS handoff.
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
            which the helpers toggle so the token layer flips every color token for
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
            Glass is a theme preference, not a prop to add to every component. The material contract distinguishes stable content
            glass from functional Liquid Glass. Reading surfaces and text-entry wells stay still; floating navigation, controls
            and overlays can use liquid material where their role calls for it. Labels, images, chart marks and layout wrappers
            do not become separate glass panels. Tint density and custom motion are separate decisions, and native Liquid Glass
            does not need added wobble.
          </P>
          <P>
            Omit both surface booleans to follow the platform default: glass on supported iOS 26+ and solid elsewhere. Use{" "}
            <InlineCode>glass</InlineCode> or <InlineCode>solid</InlineCode> on <InlineCode>ThemeProvider</InlineCode> to choose an
            appearance. Solid means opaque fill, readable foreground, boundaries and elevation. Accessibility preferences and
            available native or browser material determine the rendered result. Switching appearance must preserve focus,
            values, open controls and scrolling. Components read this preference from the provider, not from CSS.
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
            <Bullet>Shared GlassSurface and GlassPane rendering owns material selection and clipping. Native Liquid Glass, static frost and browser lens effects are different capabilities; a browser preview of an iOS skin does not prove native rendering</Bullet>
            <Bullet>No semantic token changes: popover and card keep the same opaque values they carry in solid mode. Glass adds its own fills, glass-tint, glass-tint-content, glass-tint-control and glass-tint-dense, painted under the material by the surfaces of each layer</Bullet>
            <Bullet>Brand and status meanings remain readable in every material. Check contrast against actual backgrounds, including scrolling content; a tint token or a decorative rim alone does not establish it</Bullet>
            <Bullet>Solid surfaces retain their full opaque treatment without glass capture or droplet animation. Reduce Transparency and Increase Contrast require readable opaque treatment; Reduce Motion removes nonessential movement without requiring opacity by itself</Bullet>
            <Bullet>Android blur needs a safe live backdrop target. The optional @ionizeio/canvas-blur integration on Android 12+ with Expo SDK 57 enables capture only while glass needs it. OverlayProvider supplies safe overlay targets; BackdropHost can supply a separate decorative scene to inline surfaces. Missing or unsafe material uses the complete solid skin</Bullet>
            <Bullet>These docs mount the kit's Backdrop scene behind the shell in glass mode. Separately, the CSS handoff uses data-surface to apply a decorative page backdrop; neither mechanism supplies native material by itself</Bullet>
          </Column>
          <H3>Web helpers</H3>
          <P muted>The helpers persist the choice and update the CSS handoff attributes. Feed the same choice to ThemeProvider so React Native components follow it.</P>
          <CodeBlock code={JS_SURFACE} />
        </Section>

        <Rule />

        <Section title="Density">
          <P>
            Density controls spacing in content areas and data tables, and it is a per-component choice on every platform: pass the{" "}
            <InlineCode>compact</InlineCode> or <InlineCode>comfortable</InlineCode> boolean to the components that support it (for
            example <InlineCode>Card</InlineCode> and <InlineCode>DataTable</InlineCode>). The separate CSS handoff supports an
            app-wide density attribute for the card and table spacing tokens it defines.
          </P>
          <CodeBlock code={DENSITY} />
          <H3>Web helpers</H3>
          <P muted>
            The helpers persist an app-wide preference (compact, regular, comfy) and set <InlineCode>data-density</InlineCode> on{" "}
            <InlineCode>{"<html>"}</InlineCode>, which the CSS handoff reads. Read the stored value back and map it to component
            booleans to apply that preference to React Native components.
          </P>
          <CodeBlock code={JS_DENSITY} />
        </Section>

        <Rule />

        <Section title="Combining Axes">
          <P>
            All three axes are independent and composable. Scheme and surface are <InlineCode>ThemeProvider</InlineCode> props on
            every platform; density is per component. The web helpers persist all three choices and update the CSS handoff through
            the <InlineCode>dark</InlineCode> class, <InlineCode>data-surface</InlineCode>, and <InlineCode>data-density</InlineCode>.
            Keep provider state and component booleans in sync with those choices.
          </P>
          <CodeBlock code={COMBINING} />
          <CodeBlock code={JS_COMBINE} />
        </Section>

        <PageNav />
      </View>
    </Page>
  );
}
