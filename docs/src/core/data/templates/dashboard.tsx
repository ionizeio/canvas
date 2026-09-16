import { useState } from "react";
import { Row, Column, Card, Typography, Button, Badge, Stats, Feed, Tabs, LineChart, Progress, useFormFactor, useToast, Grid } from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

// Admin dashboard built from real Canvas components: a Stats hero row with
// sparkline trends, the recent-activity Feed beside a range-switchable
// sign-ins LineChart, and auto-wrapping secondary widget Cards.

const SIGN_IN_RANGES = [
  {
    tab: "24 h",
    labels: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00", "Now"],
    values: [138, 96, 84, 210, 342, 396, 371, 428, 465],
  },
  {
    tab: "7 d",
    labels: ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"],
    values: [2843, 1918, 1730, 3122, 3365, 3290, 3541],
  },
  {
    tab: "30 d",
    labels: ["Jun 19", "Jun 23", "Jun 27", "Jul 1", "Jul 5", "Jul 9", "Jul 13", "Jul 17"],
    values: [16400, 17250, 15800, 18930, 19620, 21400, 20860, 22610],
  },
];

const SIGN_IN_METHODS = [
  { label: "Password", share: 0.48 },
  { label: "Google", share: 0.22 },
  { label: "WebAuthn", share: 0.14 },
  { label: "GitHub", share: 0.09 },
  { label: "Other", share: 0.07 },
];

const SERVICES = [
  { name: "Login flow", latency: "22 ms", healthy: true },
  { name: "Admin API", latency: "8 ms", healthy: true },
  { name: "Webhooks", latency: "340 ms", healthy: false },
  { name: "Database", latency: "3 ms", healthy: true },
];

function ActivityAndChartLive() {
  // Phone stacks the panes; wider form factors split them into two equal fill
  // columns (equal-width fill children, so this stays a hook-driven branch
  // rather than a Row `stacks`, which keeps children's own sizing).
  const narrow = useFormFactor() === "phone";
  const [range, setRange] = useState(0);
  const { toast } = useToast();
  const r = SIGN_IN_RANGES[range];

  const activity = (
    <Column cozy>
      <Row between alignCenter>
        <Typography h4>Recent activity</Typography>
        <Button
          ghost
          small
          onPress={() => toast({ info: true, message: "Audit log", description: "The full activity stream would open here." })}
        >
          View all
        </Button>
      </Row>
      <Feed
        connector
        items={[
          { actor: "rachel.chen@example.com", action: "signed in", target: "(session.created)", time: "2 min ago" },
          { actor: "admin@example.com", action: "revoked a session", target: "(session.revoked)", time: "12 min ago" },
          { actor: "cli_billing_m2m", action: "exchanged client credentials", target: "(token.issued)", time: "27 min ago" },
        ]}
      />
    </Column>
  );

  const chart = (
    <Column cozy>
      <Row between alignCenter wrap>
        <Typography h4>Sign-ins</Typography>
        <Tabs pills tabs={SIGN_IN_RANGES.map((x) => x.tab)} active={range} onSelect={setRange} />
      </Row>
      {/* Keyed per range so the chart's internal scrub selection resets when the
          data (and its point count) changes. */}
      <LineChart
        key={r.tab}
        labels={r.labels}
        series={[{ label: "Sign-ins", values: r.values }]}
        curved
        fade
      />
    </Column>
  );

  if (narrow) {
    return (
      <Column relaxed>
        {activity}
        {chart}
      </Column>
    );
  }
  return (
    <Row relaxed alignStart>
      <Column fill>{activity}</Column>
      <Column fill>{chart}</Column>
    </Row>
  );
}

function SecondaryWidgetsLive() {
  const { toast } = useToast();
  return (
    <Grid minTileWidth={280} relaxed>
      <Card grow>
        <Column cozy>
          <Typography h4>Sign-in methods</Typography>
          {SIGN_IN_METHODS.map((m) => (
            <Column key={m.label} tight>
              <Row between>
                <Typography small medium>{m.label}</Typography>
                <Typography small>{Math.round(m.share * 100)}%</Typography>
              </Row>
              <Progress value={m.share} accessibilityLabel={`${m.label} share of sign-ins`} />
            </Column>
          ))}
        </Column>
      </Card>
      <Card grow>
        <Column cozy>
          <Row between alignCenter>
            <Typography h4>Service health</Typography>
            <Button
              ghost
              small
              onPress={() => toast({ info: true, message: "Status page", description: "The public status page would open here." })}
            >
              Status page
            </Button>
          </Row>
          <Column snug>
            {SERVICES.map((sv) => (
              <Row key={sv.name} between alignCenter>
                <Row snug alignCenter>
                  {sv.healthy ? (
                    <Badge status success>Healthy</Badge>
                  ) : (
                    <Badge status warning>Degraded</Badge>
                  )}
                  <Typography small medium>{sv.name}</Typography>
                </Row>
                <Typography tiny>{sv.latency}</Typography>
              </Row>
            ))}
          </Column>
        </Column>
      </Card>
      <Card grow>
        <Column cozy>
          <Typography h4>Storage</Typography>
          <Column tight>
            <Row between>
              <Typography small medium>Used</Typography>
              <Typography small>68 GB of 100 GB</Typography>
            </Row>
            <Progress value={0.68} accessibilityLabel="Storage used" />
          </Column>
          <Typography tiny>Session recordings and audit exports count toward storage.</Typography>
          <Row>
            <Button
              outline
              small
              onPress={() => toast({ info: true, message: "Storage settings", description: "Storage management would open here." })}
            >
              Manage storage
            </Button>
          </Row>
        </Column>
      </Card>
    </Grid>
  );
}

export const DASHBOARD_TEMPLATE: TemplateDoc = {
  slug: "dashboard",
  name: "Dashboard",
  description: "Admin overview: hero stats with trends, an activity feed beside a range-switchable sign-ins chart, and secondary widgets. Built from live Canvas components.",
  sections: [
    {
      title: "Hero stats",
      anatomy: "Stats group of four stat cards (label, headline value, toned delta, Sparkline trend) that reflows from one row down to a single column as the viewport narrows.",
      render: () => (
        <Stats
          items={[
            { label: "Active identities", value: "12,348", delta: "+142 today", spark: [22, 24, 23, 26, 28, 27, 30, 32, 34, 33, 36, 38] },
            { label: "Active sessions", value: "1,204", delta: "+8% vs yesterday", spark: [14, 16, 15, 18, 17, 19, 21, 20, 23, 22, 24, 26] },
            { label: "OAuth2 clients", value: "38", delta: "6 M2M, 32 user", spark: [30, 31, 31, 32, 33, 33, 34, 35, 35, 36, 37, 38] },
            { label: "Locked accounts", value: "6", delta: "+2 since 1 h ago", down: true, spark: [1, 1, 2, 1, 2, 2, 3, 3, 4, 4, 5, 6] },
          ]}
        />
      ),
    },
    {
      title: "Activity and chart",
      anatomy: "Recent-activity Feed (connector timeline, View all toasts) beside the sign-ins LineChart with a pills-Tabs range switcher (24 h / 7 d / 30 d) that swaps the plotted data; the panes stack below the sm breakpoint.",
      render: () => <ActivityAndChartLive />,
    },
    {
      title: "Secondary widgets",
      anatomy: "Auto-wrapping Cards: sign-in method shares as labeled Progress meters, service health rows with status Badges and latencies, and the storage meter with its manage action.",
      render: () => <SecondaryWidgetsLive />,
    },
  ],
};
