import { Row, Column, Card, Typography, Button, Badge, Breadcrumb, DataTable, Feed, DescriptionList, Divider, Avatar, Icon, useToast } from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

// Order detail built from real Canvas components: breadcrumb + header with the
// fulfillment status and toast-backed actions, line items and the shipment
// timeline in the main column, and the customer / shipping / summary sidebar
// with copyable record IDs. Two thirds and one third side by side, stacking
// once the section is md wide or narrower.

const ITEMS = [
  { product: "Canvas Pro Plan", qty: "2", price: "$198.00" },
  { product: "Priority Support (1yr)", qty: "1", price: "$49.00" },
  { product: "Custom Theme Pack", qty: "1", price: "$29.00" },
];

const TIMELINE = [
  { id: "delivered", actor: "Delivered", action: "handed to the customer", time: "May 22, 2026, 2:15 PM" },
  { id: "shipped", actor: "Shipped", action: "left the fulfillment center", time: "May 21, 2026, 9:30 AM" },
  { id: "paid", actor: "Payment confirmed", action: "card charged $300.84", time: "May 20, 2026, 11:02 AM" },
  { id: "placed", actor: "Order placed", action: "submitted through checkout", time: "May 20, 2026, 10:58 AM" },
];

const SUMMARY = [
  { label: "Subtotal", value: "$276.00" },
  { label: "Shipping", value: "$0.00" },
  { label: "Tax", value: "$24.84" },
];

function DetailSidebarLive() {
  const { toast } = useToast();

  const header = (
    <Column snug>
      <Breadcrumb
        items={["Orders", "ORD-2847"]}
        onItemPress={(item) =>
          toast({ message: `Navigate to ${item}`, description: "This demo stays on the order detail." })
        }
      />
      <Row between alignCenter wrap relaxed>
        <Column tight>
          <Row snug alignCenter wrap>
            <Typography h3 semibold>ORD-2847</Typography>
            <Badge status success>Fulfilled</Badge>
          </Row>
          <Typography small>Placed May 20, 2026</Typography>
        </Column>
        <Row snug alignCenter>
          <Button
            outline
            small
            iconLeft={<Icon download size={16} />}
            onPress={() =>
              toast({ success: true, message: "Invoice downloaded", description: "ORD-2847.pdf saved to your downloads." })
            }
          >
            Invoice
          </Button>
          <Button
            primary
            small
            onPress={() =>
              toast({ success: true, message: "Receipt sent", description: "rachel.chen@example.com will receive a copy." })
            }
          >
            Resend receipt
          </Button>
        </Row>
      </Row>
    </Column>
  );

  const main = (
    <Column relaxed>
      <Column snug>
        <Typography h4>Items</Typography>
        <DataTable
          bordered
          columns={["Product", "Qty", "Price"]}
          rows={ITEMS.map((i) => [i.product, i.qty, i.price])}
          onRowPress={(_row, index) =>
            toast({
              message: ITEMS[index].product,
              description: `Qty ${ITEMS[index].qty}, line total ${ITEMS[index].price}.`,
            })
          }
        />
      </Column>
      <Column snug>
        <Typography h4>Timeline</Typography>
        <Feed connector items={TIMELINE} />
      </Column>
    </Column>
  );

  const side = (
    <Column relaxed>
      <Card>
        <Column cozy>
          <Typography h4>Customer</Typography>
          <Row snug alignCenter>
            <Avatar small name="RC" />
            <Column tight>
              <Typography small medium>Rachel Chen</Typography>
              <Typography tiny>rachel.chen@example.com</Typography>
            </Column>
          </Row>
          <Divider />
          <DescriptionList
            inline
            onCopy={(value) => toast({ success: true, message: "Copied to clipboard", description: value })}
            items={[
              { term: "Order ID", value: "ORD-2847", mono: true, copyValue: "ORD-2847" },
              { term: "Payment ID", value: "pay_9f3k82aq", mono: true, copyValue: "pay_9f3k82aq" },
              { term: "Customer ID", value: "cus_8c3177fe", mono: true, copyValue: "cus_8c3177fe" },
            ]}
          />
        </Column>
      </Card>
      <Card>
        <Column cozy>
          <Typography h4>Shipping</Typography>
          <Column tight>
            <Typography small>Rachel Chen</Typography>
            <Typography small>42 Innovation Drive</Typography>
            <Typography small>San Francisco, CA 94107</Typography>
            <Typography small>United States</Typography>
          </Column>
          <Row>
            <Button
              outline
              small
              iconLeft={<Icon truck size={16} />}
              onPress={() =>
                toast({ info: true, message: "Tracking opened", description: "UPS 1Z999AA10123456784, delivered May 22." })
              }
            >
              Track package
            </Button>
          </Row>
        </Column>
      </Card>
      <Card>
        <Column cozy>
          <Typography h4>Summary</Typography>
          <Column tight>
            {SUMMARY.map((line) => (
              <Row key={line.label} between alignCenter>
                <Typography small>{line.label}</Typography>
                <Typography body>{line.value}</Typography>
              </Row>
            ))}
          </Column>
          <Divider />
          <Row between alignCenter>
            <Typography body semibold>Total</Typography>
            <Typography body semibold>$300.84</Typography>
          </Row>
        </Column>
      </Card>
    </Column>
  );

  // Main and sidebar split two thirds to one third and stack, main first, once
  // the section is md (768) wide or narrower: below that a third is too narrow
  // for the copyable ID rows. One element tree at every width: the Row measures
  // its own container and only its layout changes.
  return (
    <Column relaxed>
      {header}
      <Row stacks stackBreakpoint="md" relaxed>
        <Column span={8}>{main}</Column>
        <Column span={4}>{side}</Column>
      </Row>
    </Column>
  );
}

export const DETAIL_SIDEBAR_TEMPLATE: TemplateDoc = {
  slug: "detail-sidebar",
  name: "Detail w/ sidebar",
  description: "Master-detail record page: order header with status and actions, line items and timeline beside a metadata sidebar. Built from live Canvas components.",
  sections: [
    {
      title: "Order detail",
      anatomy: "Breadcrumb + header Row (title, status Badge, toast-backed actions) over a two-thirds/one-third split: items DataTable and shipment Feed in the main Column; customer identity, copyable ID DescriptionList rows, shipping address, and totals Cards in the sidebar. The split is a Row stacks of span-8 and span-4 columns that stacks once the section is md wide or narrower, where a third no longer fits the ID rows.",
      render: () => <DetailSidebarLive />,
    },
  ],
};
