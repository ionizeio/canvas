import { useState } from "react";
import { Row, Column, Card, Typography, Button, Badge, DataTable, Tabs, Icon, Accordion, useToast, Grid } from "@ionizeio/canvas";
import type { ToastOptions } from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

// Live pricing page built from real Canvas components (the dogfood path): a
// billing-cycle toggle that reprices the tiers, three plan cards, a feature
// comparison table, and a billing FAQ.

type Tier = {
  name: string;
  monthly: number;
  yearly: number;
  blurb: string;
  cta: string;
  featured: boolean;
  features: string[];
  toast: ToastOptions;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    blurb: "For side projects and evaluation.",
    cta: "Start for free",
    featured: false,
    features: ["3 projects", "Community support", "1 GB storage"],
    toast: { success: true, message: "Starter activated", description: "Your workspace is on the free plan. Upgrade anytime." },
  },
  {
    name: "Pro",
    monthly: 24,
    yearly: 19,
    blurb: "For teams shipping to production.",
    cta: "Start free trial",
    featured: true,
    features: ["Unlimited projects", "Priority support", "100 GB storage", "Custom domains"],
    toast: { success: true, message: "Trial started", description: "Pro is free for 14 days. No card required." },
  },
  {
    name: "Enterprise",
    monthly: 99,
    yearly: 79,
    blurb: "For orgs with compliance needs.",
    cta: "Contact sales",
    featured: false,
    features: ["SSO / SAML", "Audit logs", "Dedicated support", "1 TB storage"],
    toast: { info: true, message: "Sales will reach out", description: "Expect a reply within one business day." },
  },
];

function PlansLive() {
  const [cycle, setCycle] = useState(0);
  const { toast } = useToast();
  const yearly = cycle === 1;
  return (
    <Column loose>
      <Row center>
        <Tabs pills tabs={[{ label: "Monthly" }, { label: "Yearly", badge: "-20%" }]} active={cycle} onSelect={setCycle} />
      </Row>
      <Grid minTileWidth={240} relaxed>
        {TIERS.map((t) => (
          <Card key={t.name} grow selected={t.featured}>
            <Column cozy>
              <Row between alignCenter>
                <Typography h4>{t.name}</Typography>
                {t.featured ? <Badge>Most popular</Badge> : null}
              </Row>
              <Row tight baseline>
                <Typography h2>${yearly ? t.yearly : t.monthly}</Typography>
                <Typography muted>/ month{yearly ? ", billed yearly" : ""}</Typography>
              </Row>
              <Typography small>{t.blurb}</Typography>
              <Column tight>
                {t.features.map((f) => (
                  <Row key={f} snug alignCenter>
                    <Icon check success size={16} />
                    <Typography small>{f}</Typography>
                  </Row>
                ))}
              </Column>
              <Button block primary={t.featured} outline={!t.featured} onPress={() => toast(t.toast)}>
                {t.cta}
              </Button>
            </Column>
          </Card>
        ))}
      </Grid>
    </Column>
  );
}

const yes = <Icon check success size={16} accessibilityLabel="Included" />;
const no = <Icon minus muted size={16} accessibilityLabel="Not included" />;

export const PRICING_TEMPLATE: TemplateDoc = {
  slug: "pricing",
  name: "Pricing",
  description: "Plan tiers with a billing-cycle toggle, a feature comparison table, and a billing FAQ. Built from live Canvas components.",
  sections: [
    {
      title: "Plan tiers",
      anatomy: "Billing-cycle toggle (Tabs pills) -> three plan Cards (name + price lockup + feature list + CTA), featured tier selected. Cards wrap to a single column on phones.",
      render: () => <PlansLive />,
    },
    {
      title: "Feature comparison",
      anatomy: "DataTable with one column per tier; cells are check / minus icons or limit values.",
      render: () => (
        <DataTable
          bordered
          columns={["Feature", "Starter", "Pro", "Enterprise"]}
          rows={[
            ["Projects", "3", "Unlimited", "Unlimited"],
            ["Storage", "1 GB", "100 GB", "1 TB"],
            ["Custom domains", no, yes, yes],
            ["Priority support", no, yes, yes],
            ["SSO / SAML", no, no, yes],
            ["Audit logs", no, no, yes],
          ]}
        />
      ),
    },
    {
      title: "Billing FAQ",
      anatomy: "Single-open Accordion of common billing questions.",
      render: () => (
        <Accordion
          items={[
            { key: "switch", title: "Can I switch plans later?", content: "Yes. Upgrades apply immediately and are prorated; downgrades take effect at the next renewal." },
            { key: "trial", title: "How does the free trial work?", content: "Pro is free for 14 days, no card required. You keep your data if you decide not to continue." },
            { key: "cancel", title: "What happens when I cancel?", content: "Your workspace drops to Starter at the end of the billing period. Nothing is deleted." },
            { key: "invoice", title: "Can I pay by invoice?", content: "Enterprise plans can pay annually by invoice with net-30 terms. Contact sales to set it up." },
          ]}
          defaultValue="switch"
        />
      ),
    },
  ],
};
