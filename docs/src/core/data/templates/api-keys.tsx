import { useState, useSyncExternalStore } from "react";
import { Row, Column, Card, Typography, Button, Badge, DataTable, Input, Alert, AlertDialog, Divider, EmptyState, Icon, useToast } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Developer API keys built from real Canvas components: the freshly created
// key reveal, the key table with mono identifiers and scope badges, and the
// destructive danger zone. The three sections render as siblings on the page,
// so the key list lives in a tiny module store (useSyncExternalStore) that
// "Create key" appends to, per-row "Revoke" removes from, and the danger
// zone clears.

interface DemoKey {
  id: number;
  name: string;
  masked: string;
  scopes: string[];
  lastUsed: string;
}

// Deterministic demo secrets: a module counter scrambled through a 32-bit LCG,
// so every press mints a fresh hex body without Date.now or Math.random.
let mintSerial = 0;
function mintSecret(): string {
  mintSerial += 1;
  let x = (mintSerial * 0x9e3779b1) >>> 0;
  let body = "";
  for (let i = 0; i < 16; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    body += (x >>> 28).toString(16);
  }
  return `cnv_live_${body}`;
}

// "cnv_live_8f2a…03f6": prefix + first four + ellipsis + last four.
function maskSecret(secret: string): string {
  const body = secret.slice("cnv_live_".length);
  return `cnv_live_${body.slice(0, 4)}…${body.slice(-4)}`;
}

// The shared demo key list. Sections subscribe through useSyncExternalStore;
// mutations replace the array immutably and notify every subscriber.
let keyList: DemoKey[] = [
  { id: 1, name: "production-backend", masked: "cnv_live_8f2a…03f6", scopes: ["read", "write"], lastUsed: "2 minutes ago" },
  { id: 2, name: "staging-worker", masked: "cnv_live_c41d…9a8b", scopes: ["read"], lastUsed: "3 hours ago" },
  { id: 3, name: "local-testing", masked: "cnv_test_77e0…12cd", scopes: ["read", "write", "admin"], lastUsed: "12 days ago" },
];
let nextId = keyList.length + 1;
const listeners = new Set<() => void>();
function subscribeKeys(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getKeys(): DemoKey[] {
  return keyList;
}
function setKeys(next: DemoKey[]) {
  keyList = next;
  listeners.forEach((l) => l());
}
function addKey(name: string, secret: string) {
  setKeys([...keyList, { id: nextId++, name, masked: maskSecret(secret), scopes: ["read", "write"], lastUsed: "Just now" }]);
}

function scopeBadges(scopes: string[]) {
  return (
    <Row tight wrap>
      {scopes.map((s) => (
        <Badge key={s} outline mono>{s}</Badge>
      ))}
    </Row>
  );
}

function CreateKeyLive() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [reveal, setReveal] = useState<{ name: string; secret: string } | null>(null);
  const create = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      toast({ error: true, message: "Name your key", description: "Enter a key name before creating it." });
      return;
    }
    const secret = mintSecret();
    addKey(trimmed, secret);
    setReveal({ name: trimmed, secret });
    setName("");
    toast({ success: true, message: "Key created", description: `${trimmed} was added to your active keys.` });
  };
  return (
    <Column cozy>
      <Card>
        <Row snug wrap alignEnd>
          <Column fill style={{ minWidth: 220 }}>
            <Input label="Key name" placeholder="production-backend" value={name} onChangeText={setName} />
          </Column>
          <Button primary onPress={create}>Create key</Button>
        </Row>
      </Card>
      {reveal != null ? (
        <>
          <Alert
            block
            warning
            icon={<Icon alertTriangle size={16} />}
            title="Copy your new key now"
            description={`This is the only time the full secret for ${reveal.name} is shown. Store it in your secrets manager.`}
          />
          <Input
            suffix="Copy"
            action
            readOnly
            value={reveal.secret}
            accessibilityLabel="New API key"
            onActionPress={() => toast({ success: true, message: "Key copied", description: `Paste the ${reveal.name} secret into your secrets manager.` })}
          />
        </>
      ) : null}
    </Column>
  );
}

function ActiveKeysLive() {
  const { toast } = useToast();
  const keys = useSyncExternalStore(subscribeKeys, getKeys, getKeys);
  const revoke = (key: DemoKey) => {
    setKeys(getKeys().filter((k) => k.id !== key.id));
    toast({ warning: true, message: "Key revoked", description: `${key.name} (${key.masked}) stops working immediately.` });
  };
  if (keys.length === 0) {
    return (
      <EmptyState
        icon={<Icon keyRound />}
        title="No active keys"
        description="Create a key above to connect your first integration."
      />
    );
  }
  return (
    <DataTable
      bordered
      columns={["Key", "Scopes", "Last used", ""]}
      rowKey={(_row, i) => keys[i]?.id ?? i}
      rows={keys.map((k) => [
        k.masked,
        scopeBadges(k.scopes),
        k.lastUsed,
        <Button key="revoke" ghost small onPress={() => revoke(k)}>Revoke</Button>,
      ])}
    />
  );
}

function DangerZoneLive() {
  const { toast } = useToast();
  const keys = useSyncExternalStore(subscribeKeys, getKeys, getKeys);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  return (
    <Card>
      <Column cozy>
        <Typography h4 destructive>Danger zone</Typography>
        <Row between alignCenter wrap>
          <Column tight fill style={{ minWidth: 220 }}>
            <Typography small medium>Revoke all keys</Typography>
            <Typography tiny>Every integration stops working immediately.</Typography>
          </Column>
          <Button
            destructive
            small
            onPress={() => {
              if (getKeys().length === 0) {
                toast({ message: "No active keys", description: "There is nothing to revoke right now." });
                return;
              }
              setRevokeAllOpen(true);
            }}
          >
            Revoke all
          </Button>
        </Row>
        {revokeAllOpen ? (
          <AlertDialog
            open
            onOpenChange={setRevokeAllOpen}
            destructive
            small
            title="Revoke all keys?"
            description={`All ${keys.length} active ${keys.length === 1 ? "key stops" : "keys stop"} working immediately. This cannot be undone.`}
            cancelLabel="Keep keys"
            confirmLabel="Revoke all"
            onConfirm={() => {
              setKeys([]);
              toast({ error: true, message: "All keys revoked", description: "Every integration is now disconnected." });
            }}
          />
        ) : null}
        <Divider />
        <Row between alignCenter wrap>
          <Column tight fill style={{ minWidth: 220 }}>
            <Typography small medium>Rotate signing secret</Typography>
            <Typography tiny>Webhook signatures change; consumers must update.</Typography>
          </Column>
          <Button
            outline
            small
            onPress={() => toast({ success: true, message: "Signing secret rotated", description: "Webhook signatures change; update your consumers." })}
          >
            Rotate secret
          </Button>
        </Row>
      </Column>
    </Card>
  );
}

export const API_KEYS_TEMPLATE: TemplateDoc = {
  slug: "api-keys",
  name: "API keys",
  description: "Create, reveal, and revoke API keys, with scoped access badges and a danger zone. Built from live Canvas components.",
  sections: [
    {
      title: "Create a key",
      anatomy: "Name Input + primary CTA; creating mints a demo secret, shows its one-time reveal (copyable Input inside a warning Alert), and appends a masked row to Active keys.",
      render: () => <CreateKeyLive />,
    },
    {
      title: "Active keys",
      anatomy: "DataTable of keys: mono prefix, scope Badges, last-used column, revoke per row; an EmptyState takes over when the last key is revoked.",
      render: () => <ActiveKeysLive />,
    },
    {
      title: "Danger zone",
      anatomy: "Bordered Card of irreversible actions, each row pairing the consequence copy with a destructive outline Button; Revoke all confirms through an AlertDialog.",
      render: () => <DangerZoneLive />,
    },
  ],
};
