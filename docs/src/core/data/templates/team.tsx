import { useState } from "react";
import { Row, Column, Card, Typography, Button, Badge, DataTable, Input, Select, Avatar, StackedList, EmptyState, Icon, useToast } from "@ionizeio/canvas";
import type { StackedListItem } from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

// Team management built from real Canvas components: an invite composer that
// appends to the live pending-invitations list, and the member table with role
// and status cells that opens (toasts) a member on row press.

const ROLES = ["Admin", "Editor", "Viewer"];

interface Member {
  name: string;
  initials: string;
  email: string;
  role: string;
  active: boolean;
}

const MEMBERS: Member[] = [
  { name: "Rachel Chen", initials: "RC", email: "rachel.chen@acme.com", role: "Admin", active: true },
  { name: "Ada Lovelace", initials: "AL", email: "ada@acme.com", role: "Editor", active: true },
  { name: "Kevin Turner", initials: "KT", email: "kevin@acme.com", role: "Editor", active: true },
  { name: "Linus Berg", initials: "LB", email: "linus@acme.com", role: "Viewer", active: true },
  { name: "Sofia Marques", initials: "SM", email: "sofia@acme.com", role: "Viewer", active: false },
];

function memberRow(m: Member) {
  return [
    <Row key="who" snug alignCenter>
      <Avatar small name={m.initials} />
      <Typography small medium>{m.name}</Typography>
    </Row>,
    m.email,
    m.role === "Admin" ? <Badge key="role">Admin</Badge> : <Badge key="role" secondary>{m.role}</Badge>,
    m.active ? (
      <Badge key="st" status success>Active</Badge>
    ) : (
      <Badge key="st" status warning>Invited</Badge>
    ),
  ];
}

// Seed invites are days old, so "Revoke expired" has something real to clear;
// invites sent from the composer arrive as "Just now" and are never expired.
const SEED_PENDING: StackedListItem[] = [
  { name: "sofia@acme.com", detail: "Invited as Viewer", meta: "2 days ago" },
  { name: "devon@acme.com", detail: "Invited as Editor", meta: "5 days ago" },
];

const isExpired = (item: StackedListItem) => item.meta !== "Just now";

// The invite composer and the pending list share one state, so a sent invite
// visibly appends to the StackedList and revoking visibly removes rows.
function InviteLive() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [role, setRole] = useState("Editor");
  const [pending, setPending] = useState(SEED_PENDING);

  const sendInvite = () => {
    const address = email.trim();
    if (!address) {
      setEmailError(true);
      toast({ error: true, message: "Enter an email address", description: "The invite needs an address to go to." });
      return;
    }
    setPending((prev) => [...prev, { name: address, detail: `Invited as ${role}`, meta: "Just now" }]);
    setEmail("");
    setEmailError(false);
    toast({ success: true, message: "Invite sent", description: `${address} was invited as ${role.toLowerCase()}.` });
  };

  const resendAll = () => {
    if (pending.length === 0) {
      toast({ warning: true, message: "No pending invitations", description: "There is nothing to resend." });
      return;
    }
    toast({
      success: true,
      message: "Invitations resent",
      description: `${pending.length} pending ${pending.length === 1 ? "invite" : "invites"} re-sent by email.`,
    });
  };

  const revokeExpired = () => {
    const expired = pending.filter(isExpired);
    if (expired.length === 0) {
      toast({ warning: true, message: "No expired invitations", description: "Every pending invite is still fresh." });
      return;
    }
    setPending((prev) => prev.filter((item) => !isExpired(item)));
    toast({
      message: expired.length === 1 ? "Expired invitation revoked" : "Expired invitations revoked",
      description: `${expired.map((item) => item.name).join(", ")} removed from the pending list.`,
    });
  };

  return (
    <Column cozy>
      <Card>
        <Row snug wrap alignEnd>
          <Column fill style={{ minWidth: 220 }}>
            <Input
              label="Email address"
              placeholder="teammate@company.com"
              value={email}
              error={emailError}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(false);
              }}
            />
          </Column>
          <Select label="Role" value={role} options={ROLES} onSelect={setRole} />
          <Button primary onPress={sendInvite}>Send invite</Button>
        </Row>
      </Card>
      {pending.length === 0 ? (
        <EmptyState
          icon={<Icon mailPlus />}
          title="No pending invitations"
          description="Everyone you invited has joined. Send a new invite above."
        />
      ) : (
        <StackedList card title="Pending invitations" items={pending} />
      )}
      <Row snug>
        <Button outline small onPress={resendAll}>Resend all</Button>
        <Button ghost small onPress={revokeExpired}>Revoke expired</Button>
      </Row>
    </Column>
  );
}

// The member table: pressing a row surrogate-opens that member via a toast.
function MembersLive() {
  const { toast } = useToast();
  return (
    <DataTable
      bordered
      columns={["Member", "Email", "Role", "Status"]}
      rows={MEMBERS.map(memberRow)}
      onRowPress={(_row, index) => {
        const m = MEMBERS[index];
        if (m) {
          toast({ message: m.name, description: `${m.email}, ${m.role.toLowerCase()}. The member profile would open here.` });
        }
      }}
    />
  );
}

export const TEAM_TEMPLATE: TemplateDoc = {
  slug: "team",
  name: "Team",
  description: "Invite teammates, manage member roles, and track pending invitations. Built from live Canvas components.",
  sections: [
    {
      title: "Invite a teammate",
      anatomy: "Email Input + role Select + primary CTA on one wrapping row; each sent invite appends to the pending-invitations StackedList below it, with resend-all and revoke-expired actions.",
      render: () => <InviteLive />,
    },
    {
      title: "Members",
      anatomy: "DataTable with Avatar + name cells, role Badges, and live status Badges; press a row to open that member.",
      render: () => <MembersLive />,
    },
  ],
};
