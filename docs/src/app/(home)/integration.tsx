import { View } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../ui/page";
import { Section } from "../../ui/section";
import { P, H3, InlineCode, Rule } from "../../ui/prose";
import { CodeBlock } from "../../ui/code-block";
import { PageNav } from "../../ui/page-nav";

const INSTALL = `npm install @ionizeio/canvas react react-native react-native-svg`;

const OPTIONAL_INSTALL = `# add only the ones whose feature you use
npm install react-native-qrcode-svg react-native-safe-area-context expo-blur expo-glass-effect expo-clipboard`;

const QUICK_START = `import { ThemeProvider, Button } from "@ionizeio/canvas";

// Wrap the app once in ThemeProvider; it follows the OS appearance by default
// (pass the dark or light boolean to force one). Components are React Native, so
// style them with Canvas's semantic boolean props.
export function App() {
  return (
    <ThemeProvider>
      <Button primary large>Save</Button>
    </ThemeProvider>
  );
}`;

const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // react-native-web reads these globals.
  define: { __DEV__: "true", global: "globalThis" },
  resolve: {
    // The single line that makes Canvas run in the browser.
    alias: { "react-native": "react-native-web" },
    // Prefer .web.* implementations (react-native-svg ships them).
    extensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".js"],
  },
  optimizeDeps: {
    include: ["react-native-web", "react-native-svg"],
    esbuildOptions: {
      resolveExtensions: [".web.tsx", ".web.ts", ".web.js", ".tsx", ".ts", ".js"],
    },
  },
});`;

const WEB_ENTRY = `import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@ionizeio/canvas";
// The CSS token layer: plain custom properties, no build step. Carries the
// .dark scheme hook and the [data-platform] skin hook, for the DOM theme
// helpers and any custom CSS you write with var().
import "@ionizeio/canvas/styles/canvas.css";
import { App } from "./app";
import { useHtmlScheme } from "./use-html-scheme";

function Root() {
  // Keep the RN ThemeProvider in sync with the <html> theme (see the hook below).
  const scheme = useHtmlScheme();
  return (
    <ThemeProvider scheme={scheme}>
      <App />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);`;

const SCHEME_HOOK = `import { useSyncExternalStore } from "react";

// setTheme() toggles <html class="dark">. Mirror that class into the value the
// ThemeProvider consumes, so the React Native components re-theme with the page.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const getSnapshot = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export function useHtmlScheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, getSnapshot, () => "light");
}`;

const THEME_API = `import { setTheme, toggleTheme, setSurface, setDensity } from "@ionizeio/canvas";

setTheme("dark");       // toggles <html class="dark"> (the class the CSS reads) and persists
toggleTheme();          // flips light <-> dark, returns the next theme
setSurface("glass");    // persists, stamps <html data-surface="glass">  (solid is the default)
setDensity("compact");  // persists, stamps <html data-density="compact"> (regular is the default)`;

const TOKEN = `import { token, hsl } from "@ionizeio/canvas";

// Web only: reads a CSS custom property off <html>, so it reflects the live theme.
// Requires canvas.css to be loaded; on native, theme values come from ThemeProvider.
token("primary");     // "oklch(0.511 0.262 276.966)"
token("radius-md");   // "6px"

// Color tokens are complete oklch colors. The hsl() helper (the name is
// historical) passes them through untouched; give it an alpha for a
// translucent variant, mixed the same way the token layer does it:
hsl("primary", 0.5);  // "color-mix(in oklab, oklch(0.511 0.262 276.966) 50%, transparent)"`;

const BUILDING = `import { View, Text, useTheme } from "@ionizeio/canvas";

// Build your own components the way Canvas does: raw RN View/Text styled with a
// style object built from the tokens, with flat boolean props for each style
// choice (not string enums).
interface CalloutProps {
  children: React.ReactNode;
  /** Emphasised, filled style. */
  primary?: boolean;
}

export function Callout({ children, primary }: CalloutProps) {
  const { tokens } = useTheme();
  return (
    <View style={{ borderRadius: 6, borderWidth: 1, borderColor: tokens.border, padding: 16, backgroundColor: primary ? tokens.primary : tokens.card }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: primary ? tokens["primary-foreground"] : tokens.foreground }}>
        {children}
      </Text>
    </View>
  );
}`;

const EXPORTS = [
  {
    path: "@ionizeio/canvas",
    content:
      "Components, the style foundation (ThemeProvider, useTheme, useResponsive, shadow, alpha, and the View / Text / Pressable / TextInput / ScrollView primitives), and the token / theme utilities. Ships as compiled JavaScript with TypeScript declarations.",
  },
  {
    path: "@ionizeio/canvas/styles/canvas.css",
    content:
      "The CSS token layer: plain custom properties, plus the .dark scheme hook and the [data-platform] skin hook. Web only, no build step.",
  },
];

export default function IntegrationScreen() {
  return (
    <Page>
      <View style={{ gap: 28 }}>
        <PageHeader
          title="Integration"
          description="Consume Canvas, a universal React Native UI kit, on native and on the web."
        />

        <Section title="Installation">
          <P muted>
            Canvas is published as <InlineCode>@ionizeio/canvas</InlineCode> and lists{" "}
            <InlineCode>react</InlineCode>, <InlineCode>react-native</InlineCode>, and{" "}
            <InlineCode>react-native-svg</InlineCode> as peer dependencies.
          </P>
          <CodeBlock code={INSTALL} />
        </Section>

        <Rule />

        <Section title="Optional peers">
          <P muted>
            These back specific features. Skip any you don't use; Canvas still works and degrades gracefully.
          </P>
          <P muted>
            <InlineCode>react-native-qrcode-svg</InlineCode>: renders the <InlineCode>QRCode</InlineCode> component;
            without it, <InlineCode>QRCode</InlineCode> shows an empty labeled frame.
          </P>
          <P muted>
            <InlineCode>expo-glass-effect</InlineCode>: real iOS 26 Liquid Glass for overlays and bars; without it, glass
            mode falls back to a translucent fill.
          </P>
          <P muted>
            <InlineCode>expo-blur</InlineCode>: a real frosted blur for glass mode on web, Android, and iOS &lt; 26;
            without it, glass mode falls back to a translucent fill.
          </P>
          <P muted>
            <InlineCode>react-native-safe-area-context</InlineCode>: safe-area insets for the overlays that use them
            (Drawer, sheets); without it, they fall back to fixed insets.
          </P>
          <P muted>
            <InlineCode>expo-clipboard</InlineCode>: backs the <InlineCode>CodeBlock</InlineCode> copy chip on native;
            the web covers copy with <InlineCode>navigator.clipboard</InlineCode> either way.
          </P>
          <P muted>
            <InlineCode>@shopify/react-native-skia</InlineCode>: a GPU backend a future <InlineCode>Backdrop</InlineCode>{" "}
            renderer can upgrade to; <InlineCode>Backdrop</InlineCode> draws fully through{" "}
            <InlineCode>react-native-svg</InlineCode> without it (Metro apps that skip it stub the module with one line,
            see the Backdrop docs).
          </P>
          <CodeBlock code={OPTIONAL_INSTALL} />
        </Section>

        <Rule />

        <Section title="Quick start">
          <P muted>
            Wrap the app once in <InlineCode>ThemeProvider</InlineCode> and use the components. This is the whole usage
            API, and it is the same code on iOS, Android, and the web, the component props never change per platform. On
            native (Expo or React Native CLI) it is all you need beyond your normal RN bundler; the web adds two setup
            steps, the <InlineCode>react-native-web</InlineCode> alias and <InlineCode>canvas.css</InlineCode>, shown
            below.
          </P>
          <CodeBlock code={QUICK_START} />
        </Section>

        <Rule />

        <Section title="Web setup: react-native-web">
          <P muted>
            The component code above does not change on the web; this is build configuration only. In the browser Canvas
            runs through react-native-web, so alias <InlineCode>react-native</InlineCode> to{" "}
            <InlineCode>react-native-web</InlineCode> in your bundler. Here is a Vite config (Metro and webpack take the
            same alias). <InlineCode>canvas.css</InlineCode> needs no plugin: it is plain CSS that any bundler resolves
            (next section).
          </P>
          <CodeBlock code={VITE_CONFIG} />
        </Section>

        <Rule />

        <Section title="Theming on the web">
          <P muted>
            Components theme themselves through <InlineCode>ThemeProvider</InlineCode> (they read the active scheme's
            tokens with <InlineCode>useTheme</InlineCode>). On the web you also import the CSS token layer so the DOM
            theme helpers and any custom CSS you write stay in sync. The helpers toggle attributes on{" "}
            <InlineCode>&lt;html&gt;</InlineCode>; a small hook mirrors the <InlineCode>.dark</InlineCode> class back into
            the provider so the React Native components follow the page.
          </P>
          <CodeBlock code={WEB_ENTRY} />
          <H3>The scheme-sync hook</H3>
          <CodeBlock code={SCHEME_HOOK} />
          <H3>Theme, surface, density helpers</H3>
          <P muted>
            <InlineCode>setTheme</InlineCode> and <InlineCode>toggleTheme</InlineCode> toggle the{" "}
            <InlineCode>.dark</InlineCode> class, the one hook the token layer reads, so they restyle the page by
            themselves. <InlineCode>setSurface</InlineCode> and <InlineCode>setDensity</InlineCode> persist a preference
            and stamp a <InlineCode>data-*</InlineCode> attribute that no shipped CSS reads: read the choice back
            (<InlineCode>getSurface</InlineCode>, <InlineCode>getDensity</InlineCode>) and sync it into your{" "}
            <InlineCode>ThemeProvider</InlineCode> and component props, the way the hook above syncs the scheme. All four
            are web-only (they touch <InlineCode>document</InlineCode> and <InlineCode>localStorage</InlineCode>).
          </P>
          <CodeBlock code={THEME_API} />
        </Section>

        <Rule />

        <Section title="Reading tokens (web)">
          <P muted>
            <InlineCode>token()</InlineCode> reads the live computed value of a CSS custom property off{" "}
            <InlineCode>document.documentElement</InlineCode>, so it reflects the current theme. It needs{" "}
            <InlineCode>canvas.css</InlineCode> loaded and is web-only; on native, read theme values from{" "}
            <InlineCode>useTheme()</InlineCode> instead.
          </P>
          <CodeBlock code={TOKEN} />
        </Section>

        <Rule />

        <Section title="Building on Canvas">
          <P>
            Compose Canvas components directly, or build your own on the React Native primitives (<InlineCode>View</InlineCode>,{" "}
            <InlineCode>Text</InlineCode>, <InlineCode>Pressable</InlineCode>, <InlineCode>TextInput</InlineCode>,{" "}
            <InlineCode>ScrollView</InlineCode>; <InlineCode>Image</InlineCode> is a Canvas atom, not a primitive). Follow the Canvas convention: one
            flat boolean prop per style choice, not string-enum <InlineCode>variant</InlineCode>/<InlineCode>size</InlineCode>{" "}
            props.
          </P>
          <CodeBlock code={BUILDING} />
        </Section>

        <Rule />

        <Section title="Package exports">
          {EXPORTS.map((e) => (
            <View key={e.path} style={{ gap: 2 }}>
              <P>
                <InlineCode>{e.path}</InlineCode>
              </P>
              <P muted>{e.content}</P>
            </View>
          ))}
        </Section>

        <PageNav />
      </View>
    </Page>
  );
}
