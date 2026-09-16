import { Linking } from "react-native";
import { Column, Row, Button, DataTable, Icon } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../ui/page";
import { Section } from "../../ui/section";
import { P, H3, Rule } from "../../ui/prose";
import { Surface } from "../../ui/tokens-kit";
import { DocsSurface } from "../../ui/surface";
import { PageNav } from "../../ui/page-nav";
import {
  PRIVACY_TITLE,
  PRIVACY_INTRO,
  PRIVACY_SUMMARY,
  PRIVACY_NOT_DONE,
  PRIVACY_NETWORK_COLUMNS,
  PRIVACY_NETWORK_ROWS,
  PRIVACY_NETWORK_INTRO,
  PRIVACY_NETWORK_OUTRO,
  PRIVACY_SECTIONS,
  PRIVACY_ISSUES_URL,
} from "../../data/privacy-policy";

// The in-app privacy policy. The words live in ../../data/privacy-policy, which
// tools/privacygen/generate.ts also bakes into the static page the stores actually fetch
// (see that module's header for why a static copy is required), so the two can never drift.

export default function PrivacyScreen() {
  return (
    <Page>
      <Column loose>
        <PageHeader title={PRIVACY_TITLE} description={PRIVACY_INTRO} />

        <Section title="Summary">
          <P muted>{PRIVACY_SUMMARY}</P>
        </Section>

        <Rule />

        <Section title="What Canvas does not do">
          <Column relaxed>
            {PRIVACY_NOT_DONE.map((n) => (
              <Surface key={n.title} padding={16}>
                <Column tight>
                  <H3>{n.title}</H3>
                  <P muted>{n.description}</P>
                </Column>
              </Surface>
            ))}
          </Column>
        </Section>

        <Rule />

        <Section title="Network connections">
          <P muted>{PRIVACY_NETWORK_INTRO}</P>
          <DocsSurface bordered>
            <DataTable columns={PRIVACY_NETWORK_COLUMNS} rows={PRIVACY_NETWORK_ROWS} />
          </DocsSurface>
          <P muted>{PRIVACY_NETWORK_OUTRO}</P>
        </Section>

        {PRIVACY_SECTIONS.map((s) => (
          <Column key={s.title} loose>
            <Rule />
            <Section title={s.title}>
              <P muted>{s.description}</P>
            </Section>
          </Column>
        ))}

        <Row cozy wrap>
          <Button outline iconRight={<Icon arrowRight size={15} />} onPress={() => Linking.openURL(PRIVACY_ISSUES_URL)}>
            Open an issue
          </Button>
        </Row>

        <PageNav />
      </Column>
    </Page>
  );
}
