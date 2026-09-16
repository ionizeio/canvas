import { useState } from "react";
import { Row, Column, Card, Typography, Button, Badge, Breadcrumb, Avatar, Divider, Stats, Tabs, DescriptionList, Switch, DataTable, Icon, useToast, Grid } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Single-record detail page built from real Canvas components: the canonical
// hero card (large Avatar, identity, status Badges, plain Stats strip), Tabs
// that switch the record's facets in place (Overview traits, Security
// controls, revocable Sessions), and the layout principles behind the shape.

function HeroLive() {
  const { toast } = useToast();
  return (
    <Column cozy>
      <Breadcrumb
        items={["Team", "Rachel Chen"]}
        onItemPress={(label) => toast({ message: label, description: "This would navigate back to the team list." })}
      />
      <Card>
        <Column cozy>
          <Row relaxed alignCenter wrap>
            <Avatar large name="RC" />
            <Column tight fill style={{ minWidth: 200 }}>
              <Typography h4>Rachel Chen</Typography>
              <Typography small>Engineering Lead</Typography>
              <Row tight wrap>
                <Badge status success>Active</Badge>
                <Badge secondary>admin</Badge>
                <Badge outline>MFA enabled</Badge>
              </Row>
            </Column>
            <Row snug alignCenter>
              <Button outline small onPress={() => toast({ message: "Edit profile", description: "This would open the profile editor." })}>Edit profile</Button>
              <Button
                ghost
                small
                icon
                iconLeft={<Icon moreHorizontal size={16} />}
                accessibilityLabel="More actions"
                onPress={() => toast({ message: "More actions", description: "Export, transfer, or archive would live in this menu." })}
              />
            </Row>
          </Row>
          <Divider />
          <Stats
            plain
            items={[
              { label: "Sessions", value: "24" },
              { label: "Sign-ins (30d)", value: "142" },
              { label: "Joined", value: "Jan 2024" },
              { label: "Last active", value: "2 min ago" },
            ]}
          />
        </Column>
      </Card>
    </Column>
  );
}

const INITIAL_SESSIONS = [
  { id: "s-mac", icon: <Icon laptop muted size={16} />, device: "MacBook Pro · Chrome", location: "San Francisco, CA", lastActive: "2 min ago", current: true },
  { id: "s-phone", icon: <Icon smartphone muted size={16} />, device: "iPhone 16 · Canvas app", location: "San Francisco, CA", lastActive: "1 hour ago", current: false },
  { id: "s-tablet", icon: <Icon tablet muted size={16} />, device: "iPad Air · Safari", location: "Carmel, CA", lastActive: "Yesterday", current: false },
  { id: "s-win", icon: <Icon monitor muted size={16} />, device: "Windows 11 · Edge", location: "New York, NY", lastActive: "3 days ago", current: false },
];

function FacetsLive() {
  const { toast } = useToast();
  const [tab, setTab] = useState(0);
  const [twoFactor, setTwoFactor] = useState(true);
  const [codes, setCodes] = useState(3);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const others = sessions.filter((s) => !s.current);

  const revoke = (session: (typeof INITIAL_SESSIONS)[number]) => {
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    toast({ success: true, message: "Session revoked", description: `${session.device} in ${session.location} was signed out.` });
  };

  const overview = (
    <Row relaxed alignStart wrap>
      <Column fill style={{ flexBasis: 380, minWidth: 280 }}>
        <Card>
          <Column cozy>
            <Typography h4>Traits</Typography>
            <DescriptionList
              twoColumn
              items={[
                { term: "Email", value: "rachel.chen@example.com" },
                { term: "Name", value: "Rachel Chen" },
                { term: "Department", value: "Engineering" },
                { term: "Location", value: "San Francisco, CA" },
                { term: "Timezone", value: "America/Los_Angeles" },
              ]}
            />
          </Column>
        </Card>
      </Column>
      <Column fill style={{ flexBasis: 200, minWidth: 260 }}>
        <Card>
          <Column cozy>
            <Typography h4>Metadata</Typography>
            <DescriptionList
              twoColumn
              items={[
                { term: "Identity ID", value: "id_8f3a2b1c", mono: true },
                { term: "Schema", value: "person_v2", mono: true },
                { term: "Created", value: "Jan 15, 2024" },
                { term: "Updated", value: "May 24, 2026" },
              ]}
            />
          </Column>
        </Card>
      </Column>
    </Row>
  );

  const security = (
    <Card>
      <Column cozy>
        <Switch
          checked={twoFactor}
          onChange={(next) => {
            setTwoFactor(next);
            toast(
              next
                ? { success: true, message: "Two-factor enabled", description: "Codes from your authenticator app are now required at sign-in." }
                : { warning: true, message: "Two-factor disabled", description: "Your account now signs in with a password alone." },
            );
          }}
          description="Require a code from your authenticator app at sign-in."
        >
          Two-factor authentication
        </Switch>
        <Divider />
        <Row between alignCenter wrap>
          <Column tight fill style={{ minWidth: 220 }}>
            <Typography small medium>Password</Typography>
            <Typography tiny>Last changed 4 months ago.</Typography>
          </Column>
          <Button outline small onPress={() => toast({ message: "Change password", description: "This would open the password update flow." })}>Change password</Button>
        </Row>
        <Divider />
        <Row between alignCenter wrap>
          <Column tight fill style={{ minWidth: 220 }}>
            <Typography small medium>Recovery codes</Typography>
            <Typography tiny>{codes} of 10 unused codes remain.</Typography>
          </Column>
          <Button
            ghost
            small
            onPress={() => {
              setCodes(10);
              toast({ success: true, message: "Recovery codes regenerated", description: "10 fresh codes replaced the old set. Store them somewhere safe." });
            }}
          >
            Regenerate
          </Button>
        </Row>
      </Column>
    </Card>
  );

  const sessionsPane = (
    <Column cozy>
      <Row between alignCenter wrap>
        <Typography tiny>Signed in on {sessions.length} {sessions.length === 1 ? "device" : "devices"}.</Typography>
        <Button
          destructive
          small
          disabled={others.length === 0}
          onPress={() => {
            setSessions((prev) => prev.filter((s) => s.current));
            toast({ success: true, message: "Other sessions revoked", description: `${others.length} ${others.length === 1 ? "session was" : "sessions were"} signed out.` });
          }}
        >
          Revoke all others
        </Button>
      </Row>
      <DataTable
        bordered
        columns={["Device", "Location", "Last active", ""]}
        rowKey={(_, index) => sessions[index]?.id ?? index}
        rows={sessions.map((s) => [
          <Row key="device" snug alignCenter>
            {s.icon}
            <Typography small medium>{s.device}</Typography>
          </Row>,
          s.location,
          s.lastActive,
          s.current ? (
            <Badge key="current" status success>Current</Badge>
          ) : (
            <Button key="revoke" ghost small onPress={() => revoke(s)}>Revoke</Button>
          ),
        ])}
      />
    </Column>
  );

  return (
    <Column cozy>
      <Tabs
        tabs={[{ label: "Overview" }, { label: "Security" }, { label: "Sessions", badge: String(sessions.length) }]}
        active={tab}
        onSelect={setTab}
      />
      {tab === 0 ? overview : tab === 1 ? security : sessionsPane}
    </Column>
  );
}

function Principle({ title, children }: { title: string; children: string }) {
  return (
    <Card grow>
      <Column tight>
        <Typography small medium>{title}</Typography>
        <Typography tiny>{children}</Typography>
      </Column>
    </Card>
  );
}

export const PROFILE_TEMPLATE: TemplateDoc = {
  slug: "profile",
  name: "Profile",
  description: "Single-record detail page: hero identity card, stat strip, tabbed facets, and a two-column content grid. Built from live Canvas components.",
  sections: [
    {
      title: "Identity header",
      description: "The hero strip is the canonical identity block: who this is, their status, and a few key stats. The same shape on every detail page in the product, so users learn it once.",
      anatomy: "Breadcrumb -> hero Card: large Avatar + name, role, and status Badges beside the profile actions, with a plain Stats strip under a Divider.",
      render: () => <HeroLive />,
    },
    {
      title: "Record facets",
      description: "Tabs hold the record's facets so users scroll rather than navigate. The wider left column carries primary content; the narrower right column carries metadata and secondary panes.",
      anatomy: "Underline Tabs switch the panes in place: Overview is a 2/3 + 1/3 grid of read-only DescriptionList rows, Security is the 2FA Switch plus credential actions, and Sessions is a DataTable with per-row revoke.",
      render: () => <FacetsLive />,
    },
    {
      title: "Layout principles",
      anatomy: "Four principle Cards on a wrapping row, each pairing a rule of the detail-page shape with its rationale.",
      render: () => (
        <Grid minTileWidth={240} relaxed>
          <Principle title="Breadcrumb + back action">Detail pages have two ways back. The breadcrumb is the discoverable one; the back button is the fast one. Both land in the same place.</Principle>
          <Principle title="Hero strip is canonical">Avatar, identity, status pills, and stat strip. The same shape on every detail page in the product. Users learn it once.</Principle>
          <Principle title="Tabs over sub-pages">For a single record, tabs scroll faster than navigating between pages. Use real pages only when sub-data needs its own URL.</Principle>
          <Principle title="2/3 + 1/3 is the default">Two columns: the wider one holds primary content (traits, credentials), the narrower one holds metadata and secondary panes.</Principle>
        </Grid>
      ),
    },
  ],
};
