import { View, Text, Row, Column, Typography, useTheme, useResponsive } from "@ionizeio/canvas";
import { Page } from "../../../ui/page";
import { PageNav } from "../../../ui/page-nav";
import { sans, geistMono } from "../../../ui/fonts";
import { TokenH1, TokenLede, TokenSection, Surface, Grid } from "../../../ui/tokens-kit";

// The Canvas type scale is the Typography component's roles: Dark Factory's dense
// scale in Manrope, bold titles stepping down in size from the display 24. The
// specimen rows render the real <Typography> role (src/atoms/typography), so the
// preview reflects the package values rather than a copy; the `spec` column is the
// human-readable summary of roleType.
const SCALE = [
  { name: "Display", role: "display", spec: "24 / 27 · bold", use: "Hero titles. One per screen, at most." },
  { name: "H1", role: "h1", spec: "20 / 25 · bold", use: "Top-level page titles." },
  { name: "H2", role: "h2", spec: "17 / 22 · bold", use: "Major page sections, dialog titles." },
  { name: "H3", role: "h3", spec: "16 / 20 · bold", use: "Subsections, sheet and drawer titles." },
  { name: "H4", role: "h4", spec: "15 / 20 · bold", use: "In-app page titles, card titles." },
  { name: "H5", role: "h5", spec: "14 / 19 · bold", use: "Section and card headings, form section labels." },
  { name: "Lead", role: "lead", spec: "14 / 21 · medium", use: "Lead paragraphs, identity names." },
  { name: "Body", role: "body", spec: "12.5 / 19 · medium", use: "Default reading text." },
  { name: "Small", role: "small", spec: "11.5 / 17 · semibold · muted", muted: true, use: "Secondary text, helpers." },
  { name: "Tiny", role: "tiny", spec: "11 / 15 · semibold · muted", muted: true, use: "Metadata, timestamps, labels." },
] as const;

// Helper roles beyond the size scale, also boolean props on Typography: a muted
// body, an uppercase caption/eyebrow, and two monospace roles (code carries the
// muted pill fill; mono is bare). Rendered with the real component as well.
const HELPERS = [
  { name: "Muted", role: "muted", sample: "Sphinx of black quartz, judge my vow.", use: "De-emphasised body text." },
  { name: "Caption", role: "caption", sample: "Section label", use: "Eyebrows, uppercase section labels (10/13 bold, 16% tracking)." },
  { name: "Code", role: "code", sample: "--primary", use: "Inline code, tokens, IDs (muted pill)." },
  { name: "Mono", role: "mono", sample: "01HZK7M8N9P0Q1R2", use: "Monospace values, no fill." },
] as const;

const WEIGHTS = [
  { w: "400" as const, name: "Regular", use: "The regular weight prop; no role defaults to it" },
  { w: "500" as const, name: "Medium", use: "Body and lead copy, button labels" },
  { w: "600" as const, name: "Semibold", use: "Small and tiny labels, emphasis inside a paragraph" },
  { w: "700" as const, name: "Bold", use: "Every title role and the caption eyebrow" },
  { w: "800" as const, name: "ExtraBold", use: "Stat values and stage labels in Dark Factory's scale" },
];

// The uppercase eyebrow used by the font cards and the "Patterns in use" cards:
// 11px / 500 / 0.08em (= 0.88px at 11px) / uppercase / muted.
function Eyebrow({ children }: { children: string }) {
  const { tokens } = useTheme();
  return (
    <Text style={{ fontFamily: sans("500"), fontSize: 11, letterSpacing: 0.88, textTransform: "uppercase", color: tokens["muted-foreground"], marginBottom: 8 }}>
      {children}
    </Text>
  );
}

function FontCard({ varName, sample, sampleFamily, sampleTracking, caption, specimen, specimenMono, axis }: {
  varName: string;
  sample: string;
  sampleFamily: string;
  sampleTracking: number;
  caption: string;
  specimen: string;
  specimenMono?: boolean;
  /** The weights the family ships, as the range its font package covers. */
  axis: string;
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
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 22.4, fontFamily: specimenMono ? geistMono("400") : sans("400"), color: tokens.foreground }}>
        {specimen}
      </Text>
      <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 16.8, fontFamily: sans("400"), color: tokens["muted-foreground"] }}>
        Self-hosted by the consumer · weights {axis}.
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
        <Text style={{ fontFamily: sans("500"), fontSize: 12.5, color: tokens.foreground }}>{s.name}</Text>
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
        <Text style={{ fontFamily: sans("500"), fontSize: 12.5, color: tokens.foreground }}>{h.name}</Text>
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
      <Text style={{ flex: 1, fontSize: 20, fontFamily: sans(row.w), color: tokens.foreground }}>{row.name}</Text>
      <Text style={{ fontSize: 12, color: tokens["muted-foreground"] }}>{row.use}</Text>
    </Row>
  );
}

export default function TypographyScreen() {
  const { tokens } = useTheme();
  // Column counts by the kit's viewport bucket (desktop on the server and for the
  // hydration render): two columns above md (768), the scale in two above sm (640).
  const c2 = useResponsive({ base: 2, md: 1 });
  const cScale = useResponsive({ base: 2, sm: 1 });

  return (
    <Page>
      <View style={{ gap: 40 }}>
        {/* Intro */}
        <Column cozy>
          <TokenH1>Typography</TokenH1>
          <TokenLede>
            Two families do all the work. Manrope for every label, title and paragraph; Geist Mono for
            code, IDs, timestamps, and any value the user might copy. The scale runs display down to tiny as
            boolean roles on the{" "}
            <Text style={{ fontFamily: geistMono("400") }}>Typography</Text> component; helper
            roles (muted, caption, code, mono) cover the rest.
          </TokenLede>
        </Column>

        <TokenSection
          title="Font families"
          description="Two families, registered by the consumer: the package ships no font files. Hand the registered faces to <ThemeProvider fonts> (one family that carries every weight, or a face per weight) and every kit label renders in them; omit it and the system face stands in. On the web the --font-sans / --font-mono stacks fall back to system faces until Manrope loads."
        >
          <Grid cols={c2}>
            {[
              <FontCard
                key="sans"
                varName="--font-sans"
                sample="Manrope"
                axis="200-800"
                sampleFamily={sans("500")}
                sampleTracking={0}
                caption={'"Manrope", ui-sans-serif, system-ui, ...'}
                specimen="The quick brown fox jumps over the lazy dog 0123456789"
              />,
              <FontCard
                key="mono"
                varName="--font-mono"
                sample="Geist Mono"
                axis="100-900"
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
          anatomy="display (24/27) and h1 (20/25) are distinct roles, not a shared rule; every title is bold, so the hierarchy steps down in size. Roles are mutually exclusive, first-match precedence."
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

        <TokenSection title="Weights" description="Manrope runs from 200 to 800. The docs register the five below, each as its own face, and ThemeProvider fonts maps a style's fontWeight onto the nearest registered one, since RN does not auto-map fontWeight for custom fonts.">
          <Surface padding={0} style={{ overflow: "hidden" }}>
            {WEIGHTS.map((row, i) => <WeightRow key={row.w} row={row} i={i} />)}
          </Surface>
        </TokenSection>

        <TokenSection title="Patterns in use">
          <Grid cols={c2}>
            {[
              <Surface key="header" padding={20}>
                <Eyebrow>Page header</Eyebrow>
                <Text style={{ fontSize: 22, fontFamily: sans("600"), letterSpacing: -0.44, color: tokens.foreground }}>Identities</Text>
                <Text style={{ marginTop: 4, fontSize: 14, color: tokens["muted-foreground"] }}>
                  Manage user identities in your identity service
                </Text>
              </Surface>,
              <Surface key="stat" padding={20}>
                <Eyebrow>Stat card</Eyebrow>
                <Text style={{ fontSize: 13, fontFamily: sans("500"), color: tokens["muted-foreground"] }}>Active sessions</Text>
                <Text style={{ fontSize: 28, fontFamily: sans("600"), letterSpacing: -0.56, marginTop: 4, color: tokens.foreground }}>1,204</Text>
              </Surface>,
              <Surface key="field" padding={20}>
                <Eyebrow>Field display</Eyebrow>
                <Column cozy>
                  <Row cozy baseline>
                    <Text style={{ width: 120, fontSize: 13, fontFamily: sans("500"), color: tokens["muted-foreground"] }}>Identifier</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: tokens.foreground }}>rachel.chen@example.com</Text>
                  </Row>
                  <Row cozy baseline>
                    <Text style={{ width: 120, fontSize: 13, fontFamily: sans("500"), color: tokens["muted-foreground"] }}>ID</Text>
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
