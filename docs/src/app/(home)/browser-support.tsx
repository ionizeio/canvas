import { View, Text, DataTable, useTheme } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../ui/page";
import { Section } from "../../ui/section";
import { P, H3, InlineCode, Rule, MONO } from "../../ui/prose";
import { Surface } from "../../ui/tokens-kit";
import { DocsSurface } from "../../ui/surface";
import { PageNav } from "../../ui/page-nav";

const PLATFORMS = [
  ["iOS", "React Native (native)", "iOS 13.4+"],
  ["Android", "React Native (native)", "Android 6.0+ (API 23)"],
  ["Web", "react-native-web + the canvas.css token layer", "Modern browsers (see baseline below)"],
];

const PEERS = [
  ["react", ">=18", "The React runtime Canvas builds on."],
  ["react-native", ">=0.74", "Native iOS / Android host, and the module aliased to react-native-web on the web."],
  ["react-native-svg", ">=14", "Vector icons and the chart primitives."],
];

const WEB_BASELINE = [
  ["Chrome / Edge", "111+", "CSS token layer (canvas.css)"],
  ["Safari", "16.4+", "CSS token layer (canvas.css)"],
  ["Firefox", "113+", "CSS token layer (canvas.css)"],
];

const NOTES = [
  {
    title: "Why these versions",
    description:
      "The floor is set by exactly two CSS features the token layer uses: oklch() colors and color-mix(). Both have been Baseline across Chrome, Edge, Safari, and Firefox since May 2023, and the versions above are where each engine shipped them. Nothing else in canvas.css is modern: it is plain custom properties, one @media (prefers-reduced-motion) block, and a handful of rules. There is no build step, no @property, and no cascade layers, which is what used to push the Firefox floor to 128.",
  },
  {
    title: "Native uses no CSS",
    description:
      "On iOS and Android there is no browser and no CSS feature floor. Components read the active design tokens with useTheme and build their React Native styles from them; the native minimums above come from React Native 0.74 and react-native-svg, the package's peer dependencies.",
  },
  {
    title: "The web floor comes from the stylesheet, not the components",
    description:
      "Canvas components resolve to inline styles through react-native-web and run in much older browsers. It is the shipped stylesheet, canvas.css and the token files it imports, that sets the modern-browser baseline above. If you must support older browsers, restate the same custom properties in a colour space your target supports; the token layer is plain CSS you can copy.",
  },
  {
    title: "Accessibility and motion",
    description:
      "Components handle reduced motion at the platform layer: they read the OS preference through AccessibilityInfo (React Native on native, react-native-web in the browser) and drop non-essential animation. The token layer's one contribution is the @media (prefers-reduced-motion) block that zeroes the --duration-* variables, so custom CSS written against the motion tokens quiets down with the same preference.",
  },
];

export default function BrowserSupportScreen() {
  const { tokens } = useTheme();
  return (
    <Page>
      <View style={{ gap: 28 }}>
        <PageHeader
          title="Platform & Browser Support"
          description="The platforms Canvas runs on (iOS, Android, and the web through react-native-web) and the web browser baseline."
        />

        <Section title="Platforms">
          <P muted>
            Canvas is a universal React Native UI kit. It runs natively on iOS and Android, and on the web through{" "}
            <InlineCode>react-native-web</InlineCode>.
          </P>
          <DocsSurface bordered>
            <DataTable columns={["Platform", "Runtime", "Minimum"]} rows={PLATFORMS} />
          </DocsSurface>
        </Section>

        <Rule />

        <Section title="Peer Dependencies">
          <P muted>
            These peers set the platform floor. Install them alongside <InlineCode>@ionizeio/canvas</InlineCode>.
          </P>
          <DocsSurface bordered>
            <DataTable
              columns={["Package", "Range", "Role"]}
              rows={PEERS.map(([pkg, range, role]) => [
                <Text key="pkg" style={{ fontFamily: MONO, fontSize: 14, lineHeight: 20, color: tokens.foreground }}>
                  {pkg}
                </Text>,
                range,
                role,
              ])}
            />
          </DocsSurface>
        </Section>

        <Rule />

        <Section title="Web Browser Baseline">
          <P muted>
            On the web, the modern-browser floor is set by the <InlineCode>canvas.css</InlineCode> token layer, which
            needs only oklch() and color-mix():
          </P>
          <DocsSurface bordered>
            <DataTable columns={["Browser", "Minimum Version", "Reason"]} rows={WEB_BASELINE} />
          </DocsSurface>
        </Section>

        <Rule />

        <Section title="Notes">
          <View style={{ gap: 16 }}>
            {NOTES.map((n) => (
              <Surface key={n.title} padding={16}>
                <View style={{ gap: 4 }}>
                  <H3>{n.title}</H3>
                  <P muted>{n.description}</P>
                </View>
              </Surface>
            ))}
          </View>
        </Section>

        <PageNav />
      </View>
    </Page>
  );
}
