import { useState, type ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Column,
  Container,
  DataTable,
  Divider,
  Icon,
  Input,
  Pagination,
  Row,
  Select,
  Typography,
  useToast,
} from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

// The canonical list view built from real Canvas components: a page header with
// its primary action, a toolbar whose right slot swaps between the live result
// count and bulk actions, a selectable DataTable, and a paginated footer. The
// search, filters, selection, and paging all operate on the same demo data.

type IdentityRole = "Admin" | "Editor" | "Viewer";
type IdentityStatus = "Active" | "Pending" | "Locked";

interface Identity {
  id: string;
  name: string;
  email: string;
  role: IdentityRole;
  status: IdentityStatus;
  lastSignIn: string;
}

const PAGE_SIZE = 5;
const ALL_STATUSES = "All statuses";
const ALL_ROLES = "All roles";
const STATUS_OPTIONS = [ALL_STATUSES, "Active", "Pending", "Locked"];
const ROLE_OPTIONS = [ALL_ROLES, "Admin", "Editor", "Viewer"];

const SEED: Identity[] = [
  { id: "rachel", name: "Rachel Chen", email: "rachel.chen@example.com", role: "Admin", status: "Active", lastSignIn: "2 min ago" },
  { id: "ada", name: "Ada Lovelace", email: "ada@example.com", role: "Editor", status: "Active", lastSignIn: "1 hour ago" },
  { id: "kevin", name: "Kevin Turner", email: "kevin@example.com", role: "Viewer", status: "Pending", lastSignIn: "3 days ago" },
  { id: "linus", name: "Linus Berg", email: "linus.berg@example.com", role: "Editor", status: "Locked", lastSignIn: "1 week ago" },
  { id: "sofia", name: "Sofia Marques", email: "sofia@example.com", role: "Viewer", status: "Active", lastSignIn: "4 hours ago" },
  { id: "devon", name: "Devon Carter", email: "devon@example.com", role: "Editor", status: "Active", lastSignIn: "Yesterday" },
  { id: "priya", name: "Priya Natarajan", email: "priya@example.com", role: "Admin", status: "Active", lastSignIn: "20 min ago" },
  { id: "marcus", name: "Marcus Webb", email: "marcus@example.com", role: "Viewer", status: "Pending", lastSignIn: "5 days ago" },
  { id: "elena", name: "Elena Volkov", email: "elena@example.com", role: "Editor", status: "Active", lastSignIn: "3 hours ago" },
  { id: "james", name: "James Okafor", email: "james@example.com", role: "Viewer", status: "Locked", lastSignIn: "2 weeks ago" },
  { id: "hana", name: "Hana Sato", email: "hana@example.com", role: "Editor", status: "Active", lastSignIn: "8 min ago" },
  { id: "oscar", name: "Oscar Lindqvist", email: "oscar@example.com", role: "Viewer", status: "Active", lastSignIn: "6 hours ago" },
];

// Demo people appended by the "Add identity" action, drawn in order; past the
// pool the email gets a +N suffix so every appended row stays unique.
const RECRUITS = [
  { name: "Avery Quinn", email: "avery.quinn@example.com" },
  { name: "Noor Rahman", email: "noor.rahman@example.com" },
  { name: "Tomas Rivera", email: "tomas.rivera@example.com" },
  { name: "Mina Park", email: "mina.park@example.com" },
];

function matches(i: Identity, query: string, status: string, role: string): boolean {
  const q = query.trim().toLowerCase();
  const textHit = q === "" || i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q);
  return textHit && (status === ALL_STATUSES || i.status === status) && (role === ALL_ROLES || i.role === role);
}

function statusBadge(status: IdentityStatus): ReactNode {
  if (status === "Active") return <Badge key="st" status success>Active</Badge>;
  if (status === "Pending") return <Badge key="st" status warning>Pending</Badge>;
  return <Badge key="st" status error>Locked</Badge>;
}

function identityRow(i: Identity, selected: boolean): ReactNode[] {
  return [
    <Row key="who" snug alignCenter>
      <Avatar small name={i.name} />
      <Typography small medium>{i.name}</Typography>
      {selected ? <Icon check primary size={16} accessibilityLabel="Selected" /> : null}
    </Row>,
    i.email,
    i.role === "Admin" ? <Badge key="role">Admin</Badge> : <Badge key="role" secondary>{i.role}</Badge>,
    statusBadge(i.status),
    i.lastSignIn,
  ];
}

function IdentitiesLive() {
  const { toast } = useToast();
  const [identities, setIdentities] = useState<Identity[]>(SEED);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const filtered = identities.filter((i) => matches(i, query, statusFilter, roleFilter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const paged = filtered.slice(start, start + PAGE_SIZE);

  const toggleRow = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const onAdd = () => {
    const n = identities.length - SEED.length;
    const base = RECRUITS[n % RECRUITS.length];
    const dupe = Math.floor(n / RECRUITS.length);
    const person: Identity = {
      id: `added-${n}`,
      name: base.name,
      email: dupe === 0 ? base.email : base.email.replace("@", `+${dupe + 1}@`),
      role: "Viewer",
      status: "Pending",
      lastSignIn: "Just now",
    };
    const next = [...identities, person];
    setIdentities(next);
    if (matches(person, query, statusFilter, roleFilter)) {
      const visible = next.filter((i) => matches(i, query, statusFilter, roleFilter)).length;
      setPage(Math.max(1, Math.ceil(visible / PAGE_SIZE)));
      toast({ success: true, message: "Identity added", description: `${person.name} joined as a Viewer, pending first sign-in.` });
    } else {
      toast({ success: true, message: "Identity added", description: `${person.name} is hidden by the current search or filters.` });
    }
  };

  const onExport = () => {
    const n = selected.length;
    toast({ message: "Export started", description: `${n} selected ${n === 1 ? "identity" : "identities"} will download as CSV.` });
  };

  const onDeactivate = () => {
    const n = selected.length;
    setIdentities((prev) => prev.map((i) => (selected.includes(i.id) ? { ...i, status: "Locked" } : i)));
    setSelected([]);
    toast({
      warning: true,
      message: n === 1 ? "1 identity deactivated" : `${n} identities deactivated`,
      description: "Their status is now Locked and sign-in is blocked.",
    });
  };

  const rangeLabel =
    filtered.length === 0
      ? "Showing 0 of 0"
      : `Showing ${start + 1}–${start + paged.length} of ${filtered.length}`;

  return (
    <Column relaxed>
      <Row between alignCenter wrap>
        <Column tight>
          <Typography h3>Identities</Typography>
          <Typography small>{identities.length} total</Typography>
        </Column>
        <Button primary iconLeft={<Icon userPlus primaryForeground size={16} />} onPress={onAdd}>
          Add identity
        </Button>
      </Row>

      <Card flat flush>
        <Row snug alignCenter between wrap pad>
          <Row snug alignCenter wrap fill>
            <Container xs start>
              <Input
                small
                leadingIcon
                icon="search"
                placeholder="Search identities..."
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  setPage(1);
                }}
                accessibilityLabel="Search identities"
              />
            </Container>
            <Column>
              <Select
                small
                options={STATUS_OPTIONS}
                value={statusFilter}
                onSelect={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              />
            </Column>
            <Column>
              <Select
                small
                options={ROLE_OPTIONS}
                value={roleFilter}
                onSelect={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              />
            </Column>
          </Row>
          {selected.length === 0 ? (
            <Typography tiny>{filtered.length} {filtered.length === 1 ? "result" : "results"}</Typography>
          ) : (
            <Row snug alignCenter wrap>
              <Typography tiny medium>{selected.length} selected</Typography>
              <Button outline small onPress={onExport}>Export</Button>
              <Button destructive small onPress={onDeactivate}>Deactivate</Button>
            </Row>
          )}
        </Row>
        <Divider />
        <DataTable
          selectable
          columns={["Identity", "Email", "Role", "Status", "Last sign-in"]}
          rows={paged.map((i) => identityRow(i, selected.includes(i.id)))}
          rowKey={(_row, index) => paged[index].id}
          onRowPress={(_row, index) => toggleRow(paged[index].id)}
        />
        {paged.length === 0 ? (
          <Column alignCenter padLoose>
            <Typography small>No identities match the current search and filters.</Typography>
          </Column>
        ) : null}
        <Divider />
        <Row alignCenter between wrap pad>
          <Typography tiny>{rangeLabel}</Typography>
          <Pagination small page={current} total={totalPages} onChange={setPage} />
        </Row>
      </Card>
    </Column>
  );
}

export const IDENTITIES_TEMPLATE: TemplateDoc = {
  slug: "identities",
  name: "Identities",
  description: "Searchable, filterable identity table with row selection, bulk actions, and pagination. Built from live Canvas components.",
  sections: [
    {
      title: "The shape of a list",
      description: "A list page is a toolbar + a table + a paginator. The toolbar holds search, filters, and bulk actions (which only appear when rows are selected).",
      anatomy: "PageHeader (title + primary action) -> Toolbar (search, filters, count / bulk-action slot) -> table -> footer (pagination).",
      render: () => (
        <Card>
          <Typography small>
            Search and filters live on the left of the toolbar; the right slot shows the result count until rows are selected, then swaps to bulk actions. The table fills the middle, pagination anchors the footer, and pressing a row toggles its selection.
          </Typography>
        </Card>
      ),
    },
    {
      title: "Live preview",
      description: "Everything operates on the same demo data: search combines with the Status and Role filters, pressing rows selects them (swapping the toolbar to bulk actions), Add identity appends a row, and the footer pages the filtered set.",
      anatomy: "Page header with primary CTA, toolbar (search Input + filter Selects + swapping right slot), selectable DataTable, Pagination footer.",
      render: () => <IdentitiesLive />,
    },
    {
      title: "Bulk-action toolbar swap",
      description: "When rows are selected, the right-hand slot of the toolbar swaps from result count to bulk actions. Same toolbar height, no jank.",
      render: () => (
        <Card>
          <Typography small>
            The count and the bulk actions share one toolbar slot, so selecting rows never reflows the table below it. Select a row in the live preview above to watch the result count give way to Export and Deactivate; deactivating locks the selected identities, clears the selection, and the count returns.
          </Typography>
        </Card>
      ),
    },
  ],
};
