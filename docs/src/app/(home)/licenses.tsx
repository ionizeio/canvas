import { Linking } from "react-native";
import { Column, Row, Badge, DataTable, Accordion, Button, Icon, useResponsive } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../ui/page";
import { Section } from "../../ui/section";
import { P, H3, Rule, InlineCode } from "../../ui/prose";
import { Surface } from "../../ui/tokens-kit";
import { DocsSurface } from "../../ui/surface";
import { PageNav } from "../../ui/page-nav";
import {
  THIRD_PARTY_TITLE,
  THIRD_PARTY_INTRO,
  THIRD_PARTY_CANVAS,
  THIRD_PARTY_FONTS,
  THIRD_PARTY_BREAKDOWN,
  THIRD_PARTY_PACKAGE_COUNT,
  THIRD_PARTY_PACKAGES,
  THIRD_PARTY_TEXTS,
} from "../../data/third-party-notices";

// The in-app open source licence notices. The data is GENERATED from the packages the app
// actually ships (see tools/noticegen), so this screen only arranges it.
//
// This page is not decorative. MIT requires its copyright and permission notice to travel
// with the software, and OFL-1.1 requires the same for the Geist typefaces bundled as
// .ttf files in the binary. Reproducing the notices somewhere the user can reach them is
// how those conditions are met, which is why each licence panel below lists the copyright
// lines of every package sharing that text before the text itself.

const FONTS_URL = "https://github.com/vercel/geist-font";
const SYMBOLS_URL = "https://github.com/google/material-design-icons";

/** A licence body arrives as one string; blank lines are its paragraph breaks. */
function paragraphs(body: string): string[] {
  return body.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
}

export default function LicensesScreen() {
  // Desktop-first: three columns, dropping Version at 640px and below. Scoped package
  // names wrap to three lines on a phone, which pushed the licence badge off the right
  // edge and left it clipped to "M". The licence is the whole point of the table, so the
  // version is what gives way.
  const wide = useResponsive({ base: true, sm: false });

  const rows = THIRD_PARTY_PACKAGES.map((p) => {
    const name = <InlineCode key={`${p.name}-n`}>{p.name}</InlineCode>;
    // A dual-licensed package (the Geist wrappers: MIT code, OFL-1.1 typeface) carries
    // one badge per licence rather than appearing as two near-identical rows.
    const licenses = (
      <Row key={`${p.name}-l`} tight wrap>
        {p.licenses.map((l) => (
          <Badge key={l} secondary>
            {l}
          </Badge>
        ))}
      </Row>
    );
    return wide ? [name, p.version, licenses] : [name, licenses];
  });

  const items = THIRD_PARTY_TEXTS.map((text) => {
    // The copyright lines carried by this exact licence text. Together with the body
    // below they form the full notice the licence requires to be reproduced.
    const notices = text.notices;

    return {
      key: String(text.id),
      title: `${text.title} (${text.count} ${text.count === 1 ? "package" : "packages"})`,
      content: (
        <Column relaxed>
          {notices.length > 0 && (
            <Column tight>
              <H3>Copyright notices</H3>
              {notices.map((n) => (
                <P key={n} muted>
                  {n}
                </P>
              ))}
            </Column>
          )}
          <Rule />
          <Column cozy>
            {paragraphs(text.body).map((para, i) => (
              <P key={i} muted>
                {para}
              </P>
            ))}
          </Column>
        </Column>
      ),
    };
  });

  return (
    <Page>
      <Column loose>
        <PageHeader title={THIRD_PARTY_TITLE} description={THIRD_PARTY_INTRO} />

        <Section title="Canvas">
          <P muted>{THIRD_PARTY_CANVAS}</P>
        </Section>

        <Rule />

        <Section title="Fonts">
          <Surface padding={16}>
            <Column tight>
              <H3>Typeface licences</H3>
              <P muted>{THIRD_PARTY_FONTS}</P>
            </Column>
          </Surface>
          <Row snug wrap>
            <Button
              outline
              small
              iconRight={<Icon arrowRight size={14} />}
              onPress={() => Linking.openURL(FONTS_URL)}
            >
              Geist on GitHub
            </Button>
            <Button
              outline
              small
              iconRight={<Icon arrowRight size={14} />}
              onPress={() => Linking.openURL(SYMBOLS_URL)}
            >
              Material Symbols on GitHub
            </Button>
          </Row>
        </Section>

        <Rule />

        <Section title="At a glance">
          <Row snug wrap>
            {THIRD_PARTY_BREAKDOWN.map((b) => (
              <Badge key={b.license} outline>
                {`${b.license} (${b.count})`}
              </Badge>
            ))}
          </Row>
        </Section>

        <Rule />

        <Section title={`Packages (${THIRD_PARTY_PACKAGE_COUNT})`}>
          <DocsSurface bordered>
            <DataTable
              columns={wide ? ["Package", "Version", "License"] : ["Package", "License"]}
              rows={rows}
              striped
              compact
            />
          </DocsSurface>
        </Section>

        <Rule />

        <Section title="Full license texts">
          <P muted>
            Each panel reproduces one licence in full, preceded by the copyright notices of
            every package that uses it.
          </P>
          <Accordion items={items} multiple />
        </Section>

        <PageNav />
      </Column>
    </Page>
  );
}
