import { type ReactNode } from "react";
import { useWindowDimensions, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, Pressable, Button, ScrollView, Row, Column, Icon, useTheme } from "@ionizeio/canvas";
import { useRouter } from "expo-router";
import { COMPONENTS } from "../core/data/components";
import { CanvasMark } from "../brand/canvas-mark";
import { Github } from "../brand/brand-logos";
import { HeroOrbit } from "../brand/hero-orbit";
import { ThreeLooksRotator, LOOKS_AVAILABLE } from "./three-looks-rotator";
import { CodeBlock } from "../ui/code-block";
import { sans, geistMono } from "../ui/fonts";
import { alpha } from "../ui/color";
import { useLatestVersion } from "../ui/use-latest-version";
import { useFluidType } from "../lib/fluid-type";
import { CONTENT_TOP_INSET } from "./topbar";
import { ScreenFrame } from "./native-header";

const REPO_URL = "https://github.com/ionizeio/canvas";
const NPM_URL = "https://www.npmjs.com/package/@ionizeio/canvas";
const PLATFORMS = ["iOS", "Android", "Web", "React Native Web"];

// The hosted EAS Update preview link that opens these docs in Expo Go. Set this to the
// `exp://u.expo.dev/...` preview URL printed by `eas update`; while empty, the whole
// "Get the app" section is hidden (there is nothing to scan until the update is published).

const INSTALL_BASH = "bun add @ionizeio/canvas";
const INSTALL_TSX = [
  'import "@ionizeio/canvas/styles/canvas.css";',
  'import { Button } from "@ionizeio/canvas";',
  "",
  "// The prop name is the value: <Button primary large />",
  "<Button primary large>Save changes</Button>",
  "<Button destructive>Delete</Button>",
  "<Button ghost small>Cancel</Button>",
].join("\n");

const PRINCIPLES = [
  {
    title: "Universal React Native",
    body: "One codebase, one component API, every platform. Canvas renders natively on iOS and Android, and on the web through React Native Web. Write a screen once and ship it everywhere, with no per-platform forks to maintain.",
  },
  {
    title: "Responsive, desktop-first",
    body: "Every component is highly responsive by default, authored desktop-first: size for the desktop case, then add the variants that scale it down to tablet and phone. The smallest matching breakpoint wins.",
  },
  {
    title: "Semantic UI",
    body: "Change a component's style with flat boolean props. Each choice is its own prop, named for its meaning, so the prop name is the value. You write <Button primary large>, never variant=\"primary\". It reads like a sentence.",
  },
  {
    title: "Tokens, themes, density",
    body: "Built with atomic design and driven by design tokens: light and dark schemes, a glass surface mode, and density controls. Theming is a token change, not a rewrite, so the boolean props stay your only API.",
  },
];

const ATOMIC_LEVELS: { id: string; label: string; icon: ReactNode; blurb: string; pages: { label: string; to: string }[] }[] = [
  {
    id: "tokens", label: "Tokens", icon: <Icon layers primary size={16} />,
    blurb: "The lowest-level decisions: color schemes (light and dark), typography, spacing, radii, and density. Every component derives from these tokens, so theming is a token change, not a rewrite.",
    pages: [{ label: "Colors & Theme", to: "/tokens/colors" }, { label: "Theming", to: "/theming" }],
  },
  {
    id: "atoms", label: "Atoms", icon: <Icon plus primary size={16} />,
    blurb: "Indivisible building blocks like Button, Input, Badge, Icon, and Avatar. One job each, styled entirely through semantic boolean props, every state identical on native and web.",
    pages: [
      { label: "Buttons", to: "/components/button" }, { label: "Inputs", to: "/components/input" },
      { label: "Badges", to: "/components/badge" }, { label: "Avatars", to: "/components/avatar" },
    ],
  },
  {
    id: "molecules", label: "Molecules", icon: <Icon shield primary size={16} />,
    blurb: "Small compositions of atoms with a single clear purpose: Card, Description List, Empty State. Reusable across pages and built from the same boolean prop API.",
    pages: [
      { label: "Cards", to: "/components/card" }, { label: "Description Lists", to: "/components/description-lists" },
      { label: "Empty States", to: "/components/empty-state" },
    ],
  },
  {
    id: "organisms", label: "Organisms", icon: <Icon appWindow primary size={16} />,
    blurb: "Self-contained sections of a screen: Data Table, Sidebar, Dialog, Tabs. The larger pieces that adapt desktop-first down to phone and assemble into product surfaces.",
    pages: [
      { label: "Data Tables", to: "/components/data-table" }, { label: "Sidebar", to: "/components/sidebar" },
      { label: "Dialog", to: "/components/dialog" }, { label: "Tabs", to: "/components/tabs" },
    ],
  },
  {
    id: "charts", label: "Charts", icon: <Icon chartLine primary size={16} />,
    blurb: "The data-viz tier: bars, lines, areas, pies, scatter, and the trading set (candlesticks, depth, price lines), all token-themed with a colorblind-validated series palette and scrub-to-inspect.",
    pages: [
      { label: "LineChart", to: "/components/line-chart" }, { label: "Candlestick", to: "/components/candlestick-chart" },
      { label: "PieChart", to: "/components/pie-chart" }, { label: "DepthChart", to: "/components/depth-chart" },
    ],
  },
  {
    id: "templates", label: "Templates", icon: <Icon home primary size={16} />,
    blurb: "Full screen compositions showing how atoms, molecules, and organisms assemble into real product surfaces, from a dashboard to a sign-in flow.",
    pages: [
      { label: "Dashboard", to: "/templates/dashboard" }, { label: "Sign In", to: "/templates/signin" },
      { label: "Settings", to: "/templates/settings" },
    ],
  },
  {
    id: "patterns", label: "Patterns", icon: <Icon check primary size={16} />,
    blurb: "Cross-cutting treatments that span many components: responsive layout, glass surfaces, density, loading, form validation, and accessibility.",
    pages: [
      { label: "Responsive", to: "/patterns/responsive" }, { label: "Glass", to: "/patterns/glass" },
      { label: "Density", to: "/patterns/density" },
    ],
  },
];

const FOOTER_COLS: { head: string; links: { label: string; to?: string; url?: string }[] }[] = [
  { head: "Components", links: [
    { label: "Buttons", to: "/components/button" }, { label: "Cards", to: "/components/card" },
    { label: "Data Tables", to: "/components/data-table" }, { label: "Dialog", to: "/components/dialog" },
  ] },
  { head: "Foundations", links: [
    { label: "Tokens", to: "/tokens/colors" }, { label: "Theming", to: "/theming" },
    { label: "Responsive", to: "/patterns/responsive" }, { label: "Integration", to: "/integration" },
  ] },
  { head: "Project", links: [
    { label: "GitHub", url: REPO_URL }, { label: "npm", url: NPM_URL },
  ] },
];

// .landing-wrap: the centered 1140 column with 24px gutters.
function Wrap({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ width: "100%", maxWidth: 1140, alignSelf: "center", paddingHorizontal: 24 }, style]}>{children}</View>;
}

function SectionHead({ eyebrow, title, desc, titleSize }: { eyebrow: string; title: string; desc: string; titleSize: number }) {
  const { tokens } = useTheme();
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={{ fontFamily: sans("700"), fontSize: 12, letterSpacing: 1.68, textTransform: "uppercase", color: tokens.primary, marginBottom: 12 }}>
        {eyebrow}
      </Text>
      <Text accessibilityRole="header" aria-level={2} style={{ fontFamily: sans("600"), fontSize: titleSize, letterSpacing: titleSize * -0.025, lineHeight: titleSize * 1.1, color: tokens.foreground }}>
        {title}
      </Text>
      <Text style={{ fontFamily: sans("400"), fontSize: 15.5, lineHeight: 24.8, color: tokens["muted-foreground"], maxWidth: 672, marginTop: 12 }}>
        {desc}
      </Text>
    </View>
  );
}

export function Home() {
  const { tokens, surface } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const go = (to: string) => router.push(to as never);
  const version = useLatestVersion();

  const wide = width > 920;
  const levelStack = width <= 760;

  // The "Three native looks" comparison is DESKTOP WEB ONLY, and deliberately so.
  //
  // The native bundles already skip it: their looks-shots map is empty, so
  // LOOKS_AVAILABLE is false on iOS and Android. That left mobile web, where the
  // rotator drops below its 760px column threshold and stacks the three panes into a
  // tall run of full device screenshots, one of them an Android handset.
  //
  // App Review rejected build 7 under Guideline 2.3.10 for exactly that framing:
  // "the app or metadata includes information about third-party platforms". A phone
  // browser is the surface most likely to be mistaken for the app, so the section is
  // gated on real desktop width rather than merely on the shots existing. Its own
  // threshold, not `wide`, so a future tweak to `wide` cannot silently re-expose it.
  const DESKTOP_LOOKS_MIN_WIDTH = 920;
  const showThreeLooks = LOOKS_AVAILABLE && width >= DESKTOP_LOOKS_MIN_WIDTH;
  const h1Size = useFluidType(36, 58, 0.05);
  const sectionTitle = useFluidType(26, 36, 0.034);
  const ctaTitle = useFluidType(28, 42, 0.04);

  // Glass is a theming-level surface mode: the canvas goes transparent so the Canvas
  // Universe backdrop reads through (the web shell mounts it; native mounts it via
  // ScreenFrame). The backdrop is identical on every screen so navigation never
  // interrupts the flight.
  return (
    <ScreenFrame>
    <ScrollView
      style={{ flex: 1, backgroundColor: surface === "glass" ? "transparent" : tokens.background }}
      // "automatic" lets iOS inset the content below the transparent nav bar (and it is a
      // no-op on web, where CONTENT_TOP_INSET clears the topbar). The old "never" relied on
      // the native stack insetting the FIRST scroll view it finds under the screen, which
      // broke when the Cosmos backdrop became the screen's first child; and the hero no
      // longer needs to reach the very top itself, since the backdrop fills behind the bar
      // from outside the scroller.
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: CONTENT_TOP_INSET, paddingBottom: insets.bottom + (Platform.OS === "web" ? 0 : 49) }}
    >
      {/* ── Hero ── */}
      <View style={{ paddingTop: wide ? 18 : 8, paddingBottom: 56 }}>
        <Wrap>
          {/* Tighter copy-to-orbit gap when stacked so the large phone orbit stays fully on screen. */}
          <View style={{ flexDirection: wide ? "row" : "column", gap: wide ? 48 : 16, alignItems: "center" }}>
            {/* Copy */}
            <View style={{ flex: wide ? 1.05 : undefined, width: "100%", minWidth: 0 }}>
              <Row snug alignCenter style={{ alignSelf: "flex-start", paddingVertical: 5, paddingLeft: 10, paddingRight: 12, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border, backgroundColor: alpha(tokens.card, 0.7), marginBottom: 22 }}>
                {/* The dot keeps a 7px layout box; the 3px halo ring overflows it (a 0 0 0 3px box-shadow at primary@22%). */}
                <Column flush center alignCenter style={{ width: 7, height: 7 }}>
                  <View style={{ position: "absolute", width: 13, height: 13, borderRadius: 9999, backgroundColor: alpha(tokens.primary, 0.22) }} />
                  <View style={{ width: 7, height: 7, borderRadius: 9999, backgroundColor: tokens.primary }} />
                </Column>
                <Text style={{ fontFamily: geistMono("500"), fontSize: 12, color: tokens["muted-foreground"] }}>
                  {version} ·{" "}
                  <Text
                    accessibilityRole="link"
                    onPress={() => Linking.openURL(NPM_URL)}
                    style={{ color: tokens.primary }}
                  >
                    @ionizeio/canvas
                  </Text>
                </Text>
              </Row>

              {/* The page's one level-one heading. Spelled as a heading role rather than
                  a Typography h1 because the size here is fluid (h1Size tracks the
                  viewport) where the role's type scale is fixed; the semantics are what
                  matter, and React Native Web turns this pair into a real <h1>. */}
              <Text accessibilityRole="header" aria-level={1} style={{ fontFamily: sans("600"), fontSize: h1Size, letterSpacing: h1Size * -0.032, lineHeight: h1Size * 1.04, color: tokens.foreground }}>
                One codebase. <Text style={{ color: tokens.primary }}>Every platform.</Text> One component API.
              </Text>

              <Text style={{ fontFamily: sans("400"), fontSize: 16.5, lineHeight: 26.4, color: tokens["muted-foreground"], maxWidth: 576, marginTop: 22 }}>
                Canvas is a universal React Native UI kit. The same components render natively on iOS and Android and on the web through React Native Web, styled with flat, semantic boolean props that read like a sentence.
              </Text>

              {/* On the mobile (stacked) layout the prop-proof line, CTAs, and platform
                  checks are hidden so the rotating orbit surfaces sooner; desktop keeps them. */}
              {wide ? (
                <>
                  <Row snug wrap alignCenter style={{ marginTop: 18 }}>
                    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.12), borderWidth: 1, borderColor: alpha(tokens.primary, 0.26) }}>
                      <Text style={{ fontFamily: geistMono("400"), fontSize: 12.5, color: tokens.primary }}>{"<Button primary large block>"}</Text>
                    </View>
                    <Text style={{ fontFamily: sans("400"), fontSize: 13.5, color: tokens["muted-foreground"] }}>the prop name is the value.</Text>
                  </Row>

                  <Row cozy wrap style={{ marginTop: 30 }}>
                    <Button primary large iconRight={<Icon arrowRight primaryForeground size={16} />} onPress={() => go("/components/button")}>Browse components</Button>
                    <Button outline large onPress={() => go("/tokens/colors")}>Explore tokens</Button>
                  </Row>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8, columnGap: 18, marginTop: 26 }}>
                    {PLATFORMS.map((p) => (
                      <View key={p} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Icon check primary size={13} />
                        <Text style={{ fontFamily: sans("500"), fontSize: 13.5, color: tokens["muted-foreground"] }}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>

            {/* Orbit showcase */}
            <View style={{ flex: wide ? 0.95 : undefined, width: "100%", minWidth: 0 }}>
              <HeroOrbit />
              <Text style={{ fontFamily: sans("400"), fontSize: 13, lineHeight: 20, color: tokens["muted-foreground"], marginTop: 14, paddingHorizontal: 2 }}>
                Canvas at the core; iOS, Android, and the web as targets. One component API, rendered natively on every platform.
              </Text>
            </View>
          </View>
        </Wrap>
      </View>

      {/* ── Three native looks ── the comparison hero: full-mobile screenshots of
           each atom's page on the iPhone simulator, the Pixel emulator, and phone
           web, rotating alphabetically with the CTA following the atom on stage.
           Desktop web only (see showThreeLooks above): on a device you ARE the
           platform, the native bundles skip the images, and mobile web is gated out
           because the stacked panes read as cross-platform promotion. */}
      {showThreeLooks ? (
        <Wrap style={{ paddingTop: 56, paddingBottom: 8 }}>
          <SectionHead
            eyebrow="Platform-adaptive"
            title="One component API. Three native looks."
            desc="Every Canvas component carries a skin per platform: an iOS look, Material 3 on Android, and a web look, all driven by the same JSX and the same semantic boolean props. These are real captures of every atom's page, straight from the iPhone simulator, the Pixel emulator, and the browser."
            titleSize={sectionTitle}
          />
          <ThreeLooksRotator />
        </Wrap>
      ) : null}

      {/* ── "Get the app" REMOVED (2026-07-27) ────────────────────────────────────
           This block rendered a QR code plus "Install Expo Go from the App Store or
           Google Play" with an outline button linking to play.google.com.

           It never shipped: APP_INSTALL_URL was "" so the whole thing was gated off,
           and it was NOT part of the build App Review saw. It is deleted rather than
           left dormant because the moment anyone set that constant the iOS app would
           link straight to a competing app store and instruct users to run the
           software through a third-party client. That is a live App Store violation
           sitting one assignment away, and it flatly contradicts the position we are
           putting to App Review: that the app names other platforms as technical fact
           and never sends anyone off iOS to obtain the software.

           If a hosted preview is ever wanted, put it on the DOCS SITE, not in the app.
      */}

      {/* ── Principles ── */}
      <Wrap style={{ paddingTop: 56, paddingBottom: 8 }}>
        <SectionHead
          eyebrow="The system"
          title="Four principles, one API."
          desc="The non-negotiable rules every component follows, so the styling stays predictable from the smallest atom to a full template."
          titleSize={sectionTitle}
        />
        <CardGrid cols={wide ? 2 : 1}>
          {PRINCIPLES.map((p) => (
            <View key={p.title} style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 22 }}>
              <Text accessibilityRole="header" aria-level={3} style={{ fontFamily: sans("600"), fontSize: 16, letterSpacing: -0.16, color: tokens.foreground, marginBottom: 8 }}>{p.title}</Text>
              <Text style={{ fontFamily: sans("400"), fontSize: 14, lineHeight: 22.7, color: tokens["muted-foreground"] }}>{p.body}</Text>
            </View>
          ))}
        </CardGrid>
      </Wrap>

      {/* ── Get started ── */}
      <Wrap style={{ paddingTop: 56, paddingBottom: 8 }}>
        <View style={{ flexDirection: wide ? "row" : "column", gap: wide ? 48 : 32, alignItems: "center" }}>
          <View style={{ flex: wide ? 0.9 : undefined, width: "100%" }}>
            <Text style={{ fontFamily: sans("700"), fontSize: 12, letterSpacing: 1.68, textTransform: "uppercase", color: tokens.primary, marginBottom: 12 }}>Get started</Text>
            <Text accessibilityRole="header" aria-level={2} style={{ fontFamily: sans("600"), fontSize: sectionTitle, letterSpacing: sectionTitle * -0.025, lineHeight: sectionTitle * 1.1, color: tokens.foreground }}>Three props to a styled button.</Text>
            <Text style={{ fontFamily: sans("400"), fontSize: 15.5, lineHeight: 24.8, color: tokens["muted-foreground"], maxWidth: 672, marginTop: 12 }}>
              Install the package, import the stylesheet once, and compose. No enum strings, no className soup, no platform forks. Style props group into orthogonal axes (intent, size, density): pass at most one per axis, stack the rest freely.
            </Text>
            <Pressable onPress={() => go("/integration")} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 22 }}>
              <Text style={{ fontFamily: sans("500"), fontSize: 14.5, color: tokens.primary }}>Read the integration guide</Text>
              <Icon arrowRight primary size={15} />
            </Pressable>
          </View>

          <View style={{ flex: wide ? 1.1 : undefined, width: "100%", borderRadius: 14, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, overflow: "hidden", shadowColor: tokens.foreground, shadowOpacity: 0.12, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } }}>
            <Row cozy alignCenter style={{ height: 40, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: tokens.border, backgroundColor: alpha(tokens.muted, 0.35) }}>
              <View style={{ flexDirection: "row", gap: 7 }}>
                {[0, 1, 2].map((i) => <View key={i} style={{ width: 11, height: 11, borderRadius: 9999, backgroundColor: alpha(tokens["muted-foreground"], 0.35) }} />)}
              </View>
              <Text style={{ fontFamily: geistMono("400"), fontSize: 12, color: tokens["muted-foreground"] }}>app.tsx</Text>
            </Row>
            <Column snug padTight>
              <CodeBlock code={INSTALL_BASH} />
              <CodeBlock code={INSTALL_TSX} />
            </Column>
          </View>
        </View>
      </Wrap>

      {/* ── Atomic levels ── */}
      <Wrap style={{ paddingTop: 56, paddingBottom: 8 }}>
        <SectionHead
          eyebrow="Architecture"
          title="Atomic design, end to end."
          desc={`Every page in this site is one of six levels of abstraction, and all ${COMPONENTS.length} components render as real React Native components, straight from their markdown example docs.`}
          titleSize={sectionTitle}
        />
        <Column cozy>
          {ATOMIC_LEVELS.map((lvl, i) => {
            return (
              <View key={lvl.id} style={{ flexDirection: levelStack ? "column" : "row", borderRadius: 14, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, overflow: "hidden" }}>
                <View style={{
                  width: levelStack ? "100%" : 220,
                  flexDirection: levelStack ? "row" : "column",
                  alignItems: levelStack ? "center" : "flex-start",
                  justifyContent: levelStack ? "flex-start" : "center",
                  gap: levelStack ? 14 : 12,
                  paddingVertical: levelStack ? 14 : 22,
                  paddingHorizontal: levelStack ? 18 : 22,
                  backgroundColor: alpha(tokens.muted, 0.28),
                  borderRightWidth: levelStack ? 0 : 1,
                  borderBottomWidth: levelStack ? 1 : 0,
                  borderColor: tokens.border,
                }}>
                  <Text style={{ fontFamily: geistMono("600"), fontSize: levelStack ? 22 : 30, color: alpha(tokens["muted-foreground"], 0.6) }}>0{i + 1}</Text>
                  <Row snug alignCenter>
                    {lvl.icon}
                    <Text accessibilityRole="header" aria-level={3} style={{ fontFamily: sans("600"), fontSize: 15, color: tokens.foreground }}>{lvl.label}</Text>
                  </Row>
                </View>
                <View style={{ flex: 1, paddingVertical: 20, paddingHorizontal: 22, gap: 14 }}>
                  <Text style={{ fontFamily: sans("400"), fontSize: 14, lineHeight: 22.4, color: tokens["muted-foreground"], maxWidth: 704 }}>{lvl.blurb}</Text>
                  <Row snug wrap>
                    {lvl.pages.map((pg) => (
                      <Pressable key={pg.to} onPress={() => go(pg.to)} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 9999, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.background }}>
                        <Text style={{ fontFamily: sans("500"), fontSize: 12.5, color: tokens.foreground }}>{pg.label}</Text>
                        <Icon chevronRight size={11} muted />
                      </Pressable>
                    ))}
                  </Row>
                </View>
              </View>
            );
          })}
        </Column>
      </Wrap>

      {/* ── Closing CTA band ── */}
      <View style={{ marginTop: 72, paddingVertical: 72, borderTopWidth: 1, borderColor: tokens.border, backgroundColor: alpha(tokens.muted, 0.22) }}>
        <Wrap>
          <Column flush alignCenter>
            <Text accessibilityRole="header" aria-level={2} style={{ fontFamily: sans("600"), fontSize: ctaTitle, letterSpacing: ctaTitle * -0.028, color: tokens.foreground, textAlign: "center" }}>Build your first screen.</Text>
            <Text style={{ fontFamily: sans("400"), fontSize: 16, lineHeight: 25.6, color: tokens["muted-foreground"], maxWidth: 544, textAlign: "center", marginTop: 14, marginBottom: 28 }}>
              Browse every component live, copy the JSX, and ship it to iOS, Android, and web.
            </Text>
            <Row cozy wrap center>
              <Button primary large iconRight={<Icon arrowRight primaryForeground size={16} />} onPress={() => go("/components/button")}>Browse components</Button>
              <Button outline large iconLeft={<Github size={16} color={tokens.foreground} />} onPress={() => Linking.openURL(REPO_URL)}>View on GitHub</Button>
            </Row>
          </Column>
        </Wrap>
      </View>

      {/* ── Footer ── */}
      <View style={{ borderTopWidth: 1, borderColor: tokens.border, backgroundColor: tokens.background, paddingTop: 48, paddingBottom: 32 }}>
        <Wrap>
          <View style={{ flexDirection: wide ? "row" : "column", gap: wide ? 40 : 32, paddingBottom: 40 }}>
            <View style={{ flex: wide ? 1.2 : undefined }}>
              <Pressable onPress={() => go("/")} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <CanvasMark size={26} />
                <View>
                  <Text style={{ fontFamily: sans("600"), fontSize: 15, letterSpacing: -0.15, color: tokens.foreground }}>Canvas</Text>
                  <Text style={{ fontFamily: sans("500"), fontSize: 11, letterSpacing: 0.22, color: tokens["muted-foreground"] }}>design system</Text>
                </View>
              </Pressable>
              <Text style={{ fontFamily: sans("400"), fontSize: 13.5, lineHeight: 21.6, color: tokens["muted-foreground"], maxWidth: 352, marginTop: 16 }}>
                A universal React Native UI kit. Native iOS and Android, plus web.
              </Text>
            </View>
            <View style={{ flex: wide ? 2 : undefined, flexDirection: "row", flexWrap: "wrap", gap: 28 }}>
              {FOOTER_COLS.map((col) => (
                <View key={col.head} style={{ flex: 1, minWidth: 130, gap: 11 }}>
                  <Text style={{ fontFamily: sans("700"), fontSize: 12, letterSpacing: 0.96, textTransform: "uppercase", color: tokens.foreground, marginBottom: 3 }}>{col.head}</Text>
                  {col.links.map((l) => (
                    <Pressable key={l.label} onPress={() => (l.url ? Linking.openURL(l.url) : go(l.to!))}>
                      <Text style={{ fontFamily: sans("400"), fontSize: 14, color: tokens["muted-foreground"] }}>{l.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </View>
          <Row snug wrap between style={{ paddingTop: 22, borderTopWidth: 1, borderColor: tokens.border }}>
            <Text style={{ fontFamily: sans("400"), fontSize: 12.5, color: tokens["muted-foreground"] }}>© 2026 Canvas · @ionizeio/canvas {version}</Text>
            <Text style={{ fontFamily: sans("400"), fontSize: 12.5, color: tokens["muted-foreground"] }}>Universal React Native, native iOS and Android plus web.</Text>
          </Row>
        </Wrap>
      </View>
    </ScrollView>
    </ScreenFrame>
  );
}

// A numbered step row for the "Get the app" instructions.

// A simple equal-width grid: chunk children into rows of `cols` and lay each row out
// with flex:1 cells (RN has no CSS grid; this keeps the cards even).
function CardGrid({ children, cols }: { children: ReactNode[]; cols: number }) {
  const rows: ReactNode[][] = [];
  for (let i = 0; i < children.length; i += cols) rows.push(children.slice(i, i + cols));
  return (
    <Column relaxed>
      {rows.map((row, i) => (
        <Row key={i} relaxed>
          {row}
          {row.length < cols ? Array.from({ length: cols - row.length }).map((_, j) => <View key={`pad-${j}`} style={{ flex: 1 }} />) : null}
        </Row>
      ))}
    </Column>
  );
}
