import { useWindowDimensions } from "react-native";
import { View, Text, Row, Column, Typography, useTheme } from "@nannier-com/canvas";
import { Page } from "../../../ui/page";
import { PageNav } from "../../../ui/page-nav";
import { geist, geistMono, urbanist } from "../../../ui/fonts";
import { TokenH1, TokenLede, TokenSection, Surface, Grid } from "../../../ui/tokens-kit";

// The Canvas type scale is the Typography component's roles: the Riskora ladder in
// Urbanist, titles at the regular weight so hierarchy comes from size alone. The
// specimen rows render the real <Typography> role (src/atoms/typography), so the
// preview reflects the package values rather than a copy; the `spec` column is the
// human-readable summary of roleType.
const SCALE = [
  { name: "Display", role: "display", spec: "64 / 70 · regular", use: "Hero titles. One per screen, at most." },
  { name: "H1", role: "h1", spec: "55 / 64 · regular", use: "Top-level page titles." },
  { name: "H2", role: "h2", spec: "40 / 48 · regular", use: "Major page sections." },
  { name: "H3", role: "h3", spec: "36 / 44 · regular", use: "Subsections; in-app page titles." },
  { name: "H4", role: "h4", spec: "28 / 36 · regular", use: "Card titles, dialog headings." },
  { name: "H5", role: "h5", spec: "20 / 30 · regular", use: "Section and card titles, form section labels." },
  { name: "Lead", role: "lead", spec: "20 / 30 · regular", use: "Lead paragraphs, identity names." },
  { name: "Body", role: "body", spec: "16 / 24 · regular", use: "Default reading text." },
  { name: "Small", role: "small", spec: "14 / 20 · muted", muted: true, use: "Secondary text, helpers." },
  { name: "Tiny", role: "tiny", spec: "12 / 16 · muted", muted: true, use: "Metadata, timestamps, labels." },
] as const;

// Helper roles beyond the size scale, also boolean props on Typography: a muted
// body, an uppercase caption/eyebrow, and two monospace roles (code carries the
// muted pill fill; mono is bare). Rendered with the real component as well.
const HELPERS = [
  { name: "Muted", role: "muted", sample: "Sphinx of black quartz, judge my vow.", use: "De-emphasised body text." },
  { name: "Caption", role: "caption", sample: "Section label", use: "Eyebrows, uppercase section labels (12/16 medium, 4% tracking)." },
  { name: "Code", role: "code", sample: "--primary", use: "Inline code, tokens, IDs (muted pill)." },
  { name: "Mono", role: "mono", sample: "01HZK7M8N9P0Q1R2", use: "Monospace values, no fill." },
] as const;

const WEIGHTS = [
  { w: "400" as const, name: "Regular", use: "Body text and every title role (the default weight)" },
  { w: "500" as const, name: "Medium", use: "Labels, table values, buttons, captions" },
  { w: "600" as const, name: "Semibold", use: "Emphasis inside a paragraph, a stat value" },
  { w: "700" as const, name: "Bold", use: "The Subheading eyebrow at 16" },
];

// The uppercase eyebrow used by the font cards and the "Patterns in use" cards:
// 11px / 500 / 0.08em (= 0.88px at 11px) / uppercase / muted.
function Eyebrow({ children }: { children: string }) {
  const { tokens } = useTheme();
  return (
    <Text style={{ fontFamily: geist("500"), fontSize: 11, letterSpacing: 0.88, textTransform: "uppercase", color: tokens["muted-foreground"], marginBottom: 8 }}>
      {children}
    </Text>
  );
}

function FontCard({ varName, sample, sampleFamily, sampleTracking, caption, specimen, specimenMono }: {
  varName: string;
  sample: string;
  sampleFamily: string;
  sampleTracking: number;
  caption: string;
  specimen: string;
  specimenMono?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <Surface padding={24}>
      <Eyebrow>{varName}</Eyebrow>
      <Text style={{ fontFamily: sampleFamily, fontSize: 40, lineHeight: 40, letterSpacing: sampleTracking, color: tokens.foreground }}>
        {sample}
      </Text>
      <Text style={{ marginTop: 8, fontSize: 12.5, lineHeight: 17.5, fontFamily: geistMono("400"), color: tokens["muted-foreground"] }}>
        {caption}
      </Text>
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 22.4, fontFamily: specimenMono ? geistMono("400") : geist("400"), color: tokens.foreground }}>
        {specimen}
      </Text>
      <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 16.8, fontFamily: geist("400"), color: tokens["muted-foreground"] }}>
        Self-hosted by the consumer · weight axis 100-900.
      </Text>
    </Surface>
  );
}

function ScaleRow({ s, i }: { s: typeof SCALE[number]; i: number }) {
  const { tokens } = useTheme();
  return (
    <Row loose baseline style={{
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderTopWidth: i ? 1 : 0,
      borderTopColor: tokens.border,
    }}>
      <View style={{ width: 140, flexShrink: 0 }}>
        <Text style={{ fontFamily: geist("500"), fontSize: 12.5, color: tokens.foreground }}>{s.name}</Text>
        <Text style={{ fontFamily: geistMono("400"), fontSize: 11, color: tokens["muted-foreground"] }}>{s.role}</Text>
      </View>
      {/* The real role, so the specimen IS the package value (face, size, leading, weight). */}
      <Typography {...{ [s.role]: true }} style={{ flex: 1 }}>
        Sphinx of black quartz, judge my vow.
      </Typography>
      <Text style={{ fontSize: 11, fontFamily: geistMono("400"), color: tokens["muted-foreground"], textAlign: "right", width: 160 }}>
        {s.spec}
      </Text>
    </Row>
  );
}

function HelperRow({ h, i }: { h: typeof HELPERS[number]; i: number }) {
  const { tokens } = useTheme();
  return (
    <Row loose alignCenter style={{
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderTopWidth: i ? 1 : 0,
      borderTopColor: tokens.border,
    }}>
      <View style={{ width: 140, flexShrink: 0 }}>
        <Text style={{ fontFamily: geist("500"), fontSize: 12.5, color: tokens.foreground }}>{h.name}</Text>
        <Text style={{ fontFamily: geistMono("400"), fontSize: 11, color: tokens["muted-foreground"] }}>{h.role}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Typography {...{ [h.role]: true }}>{h.sample}</Typography>
      </View>
      <Text style={{ fontSize: 11, color: tokens["muted-foreground"], textAlign: "right", width: 220 }}>
        {h.use}
      </Text>
    </Row>
  );
}

function WeightRow({ row, i }: { row: typeof WEIGHTS[number]; i: number }) {
  const { tokens } = useTheme();
  return (
    <Row loose baseline style={{
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderTopWidth: i ? 1 : 0,
      borderTopColor: tokens.border,
    }}>
      <Text style={{ width: 100, flexShrink: 0, fontSize: 12.5, fontFamily: geistMono("400"), color: tokens["muted-foreground"] }}>
        {row.w}
      </Text>
      <Text style={{ flex: 1, fontSize: 20, fontFamily: urbanist(row.w), color: tokens.foreground }}>{row.name}</Text>
      <Text style={{ fontSize: 12, color: tokens["muted-foreground"] }}>{row.use}</Text>
    </Row>
  );
}

export default function TypographyScreen() {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const c2 = width >= 760 ? 2 : 1;
  const cScale = width >= 620 ? 2 : 1;

  return (
    <Page>
      <View style={{ gap: 40 }}>
        {/* Intro */}
        <Column cozy>
          <TokenH1>Typography</TokenH1>
          <TokenLede>
            Two families do all the work. Urbanist for every label, title and paragraph; Geist Mono for
            code, IDs, timestamps, and any value the user might copy. The scale runs display down to tiny as
            boolean roles on the{" "}
            <Text style={{ fontFamily: geistMono("400") }}>Typography</Text> component; helper
            roles (muted, caption, code, mono) cover the rest.
          </TokenLede>
        </Column>

        <TokenSection
          title="Font families"
          description="Two families, registered by the consumer: the package ships no font files. Hand the registered faces to <ThemeProvider fonts> (one family that carries every weight, or a face per weight) and every kit label renders in them; omit it and the system face stands in. On the web the --font-sans / --font-mono stacks fall back to system faces until Urbanist loads."
        >
          <Grid cols={c2}>
            {[
              <FontCard
                key="sans"
                varName="--font-sans"
                sample="Urbanist"
                sampleFamily={urbanist("500")}
                sampleTracking={0}
                caption={'"Urbanist", ui-sans-serif, system-ui, ...'}
                specimen="The quick brown fox jumps over the lazy dog 0123456789"
              />,
              <FontCard
                key="mono"
                varName="--font-mono"
                sample="Geist Mono"
                sampleFamily={geistMono("600")}
                sampleTracking={-0.4}
                caption={'"Geist Mono", ui-monospace, "SF Mono", ...'}
                specimen={'const id = "01HZ73K..." // copy-friendly digits'}
                specimenMono
              />,
            ]}
          </Grid>
        </TokenSection>

        <TokenSection
          title="Type scale"
          description="Each role pairs a size with a line-height. Select one with a boolean prop on Typography (e.g. <Typography h2>), never a raw font-size."
          anatomy="display (64/70) and h1 (55/64) are distinct roles, not a shared rule; every title sits at the regular weight, so the hierarchy is size. Roles are mutually exclusive, first-match precedence."
        >
          <Surface padding={0} style={{ overflow: "hidden" }}>
            {SCALE.map((s, i) => <ScaleRow key={s.role} s={s} i={i} />)}
          </Surface>
          <Grid cols={cScale} gap={12}>
            {SCALE.map((s) => (
              <Row key={s.role} snug>
                <Text style={{ fontSize: 12.5, fontFamily: geistMono("400"), color: tokens.foreground }}>{s.role}</Text>
                <Text style={{ fontSize: 12.5, color: tokens["muted-foreground"] }}>· {s.use}</Text>
              </Row>
            ))}
          </Grid>
        </TokenSection>

        <TokenSection
          title="Helper roles"
          description="Beyond the size scale, four roles handle muted text, eyebrows, and monospace values. Pick one with a boolean prop on Typography (e.g. <Typography caption>)."
        >
          <Surface padding={0} style={{ overflow: "hidden" }}>
            {HELPERS.map((h, i) => <HelperRow key={h.role} h={h} i={i} />)}
          </Surface>
        </TokenSection>

        <TokenSection title="Weights" description="Urbanist's weight axis spans 100-900, but the kit standardizes on four; each weight is registered as its own face and ThemeProvider fonts maps a style's fontWeight onto it, since RN does not auto-map fontWeight for custom fonts.">
          <Surface padding={0} style={{ overflow: "hidden" }}>
            {WEIGHTS.map((row, i) => <WeightRow key={row.w} row={row} i={i} />)}
          </Surface>
        </TokenSection>

        <TokenSection title="Patterns in use">
          <Grid cols={c2}>
            {[
              <Surface key="header" padding={20}>
                <Eyebrow>Page header</Eyebrow>
                <Text style={{ fontSize: 22, fontFamily: geist("600"), letterSpacing: -0.44, color: tokens.foreground }}>Identities</Text>
                <Text style={{ marginTop: 4, fontSize: 14, color: tokens["muted-foreground"] }}>
                  Manage user identities in your identity service
                </Text>
              </Surface>,
              <Surface key="stat" padding={20}>
                <Eyebrow>Stat card</Eyebrow>
                <Text style={{ fontSize: 13, fontFamily: geist("500"), color: tokens["muted-foreground"] }}>Active sessions</Text>
                <Text style={{ fontSize: 28, fontFamily: geist("600"), letterSpacing: -0.56, marginTop: 4, color: tokens.foreground }}>1,204</Text>
              </Surface>,
              <Surface key="field" padding={20}>
                <Eyebrow>Field display</Eyebrow>
                <Column cozy>
                  <Row cozy baseline>
                    <Text style={{ width: 120, fontSize: 13, fontFamily: geist("500"), color: tokens["muted-foreground"] }}>Identifier</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: tokens.foreground }}>rachel.chen@example.com</Text>
                  </Row>
                  <Row cozy baseline>
                    <Text style={{ width: 120, fontSize: 13, fontFamily: geist("500"), color: tokens["muted-foreground"] }}>ID</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontFamily: geistMono("400"), color: tokens.foreground }}>01HZK7M8N9P0Q1R2S3T4U5V6W7</Text>
                  </Row>
                </Column>
              </Surface>,
              <Surface key="code" padding={20}>
                <Eyebrow>Inline code</Eyebrow>
                <Text style={{ fontSize: 13.5, lineHeight: 21.6, color: tokens.foreground }}>
                  The token <Text style={{ fontFamily: geistMono("400") }}>--primary</Text> drives the accent; override it on{" "}
                  <Text style={{ fontFamily: geistMono("400") }}>{"<html>"}</Text> to retint on the web.
                </Text>
              </Surface>,
            ]}
          </Grid>
        </TokenSection>

        <PageNav />
      </View>
    </Page>
  );
}
