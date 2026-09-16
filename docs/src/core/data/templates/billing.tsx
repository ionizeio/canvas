import { useState } from "react";
import { Row, Column, Card, Typography, Button, Badge, DataTable, Progress, DescriptionList, Divider, Emblem, Icon, AlertDialog, useToast, Grid } from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

// Billing settings built from real Canvas components: current plan + usage
// meters side by side, the payment method row, and invoice history.

const USAGE = [
  { label: "Storage", detail: "62 GB of 100 GB", value: 0.62 },
  { label: "Members", detail: "8 of 10 seats", value: 0.8 },
  { label: "API requests", detail: "1.2M of 2M", value: 0.6 },
];

const INVOICES = [
  { id: "INV-2026-007", date: "Jul 1, 2026", amount: "$192.00" },
  { id: "INV-2026-006", date: "Jun 1, 2026", amount: "$192.00" },
  { id: "INV-2026-005", date: "May 1, 2026", amount: "$168.00" },
  { id: "INV-2026-004", date: "Apr 1, 2026", amount: "$168.00" },
];

function paidBadge() {
  return (
    <Badge status success>
      Paid
    </Badge>
  );
}

function PlanUsageLive() {
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  return (
    <Grid minTileWidth={280} relaxed>
      <Card grow>
        <Column cozy>
          <Row between alignCenter>
            <Column tight fill>
              <Typography h4>Pro plan</Typography>
              <Typography small>$24 per member / month, billed monthly</Typography>
            </Column>
            <Badge status success>Active</Badge>
          </Row>
          <Divider />
          <DescriptionList
            twoColumn
            items={[
              { term: "Renews", value: "Aug 17, 2026" },
              { term: "Seats", value: "8 of 10" },
              { term: "Billing email", value: "ap@acme.com" },
            ]}
          />
          <Row snug>
            <Button
              outline
              small
              onPress={() =>
                toast({ message: "Change plan", description: "The plan picker opens here to compare Free, Pro, and Enterprise." })
              }
            >
              Change plan
            </Button>
            <Button ghost small onPress={() => setCancelOpen(true)}>
              Cancel subscription
            </Button>
          </Row>
          {cancelOpen ? (
            <AlertDialog
              open
              onOpenChange={setCancelOpen}
              destructive
              small
              title="Cancel subscription?"
              description="Your team keeps Pro access until Aug 17, 2026, then moves to the Free plan. Invoices and data are kept."
              cancelLabel="Keep plan"
              confirmLabel="Cancel subscription"
              onConfirm={() =>
                toast({ warning: true, message: "Subscription cancelled", description: "Pro access continues until Aug 17, 2026." })
              }
            />
          ) : null}
        </Column>
      </Card>
      <Card grow>
        <Column cozy>
          <Typography h4>Usage this cycle</Typography>
          {USAGE.map((u) => (
            <Column key={u.label} tight>
              <Row between>
                <Typography small medium>{u.label}</Typography>
                <Typography small>{u.detail}</Typography>
              </Row>
              <Progress value={u.value} accessibilityLabel={`${u.label} usage`} />
            </Column>
          ))}
          <Typography tiny>Usage resets at the start of each billing cycle.</Typography>
        </Column>
      </Card>
    </Grid>
  );
}

function PaymentLive() {
  const { toast } = useToast();
  return (
    <Card>
      <Row between alignCenter wrap>
        <Row snug alignCenter>
          <Emblem muted>
            <Icon creditCard />
          </Emblem>
          <Column tight>
            <Typography small medium>Visa ending in 4242</Typography>
            <Typography tiny>Expires 04 / 2028</Typography>
          </Column>
        </Row>
        <Button
          outline
          small
          onPress={() => toast({ message: "Update payment method", description: "The secure card form opens here." })}
        >
          Update
        </Button>
      </Row>
    </Card>
  );
}

function InvoicesLive() {
  const { toast } = useToast();
  return (
    <DataTable
      bordered
      columns={["Invoice", "Date", "Amount", "Status"]}
      rows={INVOICES.map((inv) => [inv.id, inv.date, inv.amount, paidBadge()])}
      onRowPress={(_row, index) => {
        const inv = INVOICES[index];
        toast({ message: `Opening ${inv.id}`, description: `${inv.date} · ${inv.amount} · Paid` });
      }}
    />
  );
}

export const BILLING_TEMPLATE: TemplateDoc = {
  slug: "billing",
  name: "Billing",
  description: "Current plan, usage meters, payment method, and invoice history. Built from live Canvas components.",
  sections: [
    {
      title: "Plan and usage",
      anatomy: "Two Cards side by side (stacking on phones): the current plan with its renewal DescriptionList rows and actions (cancelling confirms through an AlertDialog), and per-resource usage meters (Progress). ",
      render: () => <PlanUsageLive />,
    },
    {
      title: "Payment method",
      anatomy: "Card row: Emblem card icon + brand and expiry, with an update action.",
      render: () => <PaymentLive />,
    },
    {
      title: "Invoices",
      anatomy: "Invoice history DataTable; the status cell is a live Badge, and pressing a row opens its invoice.",
      render: () => <InvoicesLive />,
    },
  ],
};
