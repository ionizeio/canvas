import { useState } from "react";
import { Row, Column, Card, Typography, Button, Tabs, Input, Select, Switch, Divider, useFormFactor, useToast } from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

// Workspace settings built from real Canvas components: a vertical Tabs rail
// beside the form panes, controlled fields and switches, and a dirty-driven
// save bar that only appears once something differs from the saved baseline.

interface SettingsState {
  name: string;
  url: string;
  timezone: string;
  emailNotifications: boolean;
  securityAlerts: boolean;
  weeklyDigest: boolean;
}

const INITIAL: SettingsState = {
  name: "Acme Corp",
  url: "acme-corp",
  timezone: "America/Los_Angeles (UTC-7)",
  emailNotifications: true,
  securityAlerts: true,
  weeklyDigest: false,
};

const TIMEZONES = [
  "America/Los_Angeles (UTC-7)",
  "America/New_York (UTC-4)",
  "Europe/London (UTC+1)",
  "Europe/Berlin (UTC+2)",
  "Asia/Tokyo (UTC+9)",
];

const SECTIONS = [
  { label: "General", blurb: "Manage your workspace settings and preferences." },
  { label: "Notifications", blurb: "Choose which updates reach your inbox." },
];

function SettingsLive() {
  const { toast } = useToast();
  // Phone stacks the rail over the panes AND flips the rail Tabs to `block`, so
  // the flag stays a hook (it drives a prop, and the wide branch's fill column
  // rules out a Row `stacks` rewrite).
  const narrow = useFormFactor() === "phone";
  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(INITIAL);
  const [draft, setDraft] = useState(INITIAL);

  const dirty = (Object.keys(saved) as Array<keyof SettingsState>).some(
    (key) => saved[key] !== draft[key],
  );

  function set<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function discard() {
    setDraft(saved);
  }

  function save() {
    setSaved(draft);
    toast({
      success: true,
      message: "Settings saved",
      description: "Your workspace preferences are up to date.",
    });
  }

  const rail = (
    <Tabs
      vertical
      block={narrow}
      tabs={SECTIONS.map((s) => s.label)}
      active={tab}
      onSelect={setTab}
    />
  );

  const general = (
    <Card>
      <Column cozy>
        <Typography h4>Workspace</Typography>
        <Input
          label="Workspace name"
          value={draft.name}
          onChangeText={(text) => set("name", text)}
        />
        <Input
          label="Workspace URL"
          value={draft.url}
          onChangeText={(text) => set("url", text)}
        />
        <Select
          label="Default timezone"
          value={draft.timezone}
          onSelect={(option) => set("timezone", option)}
          options={TIMEZONES}
        />
      </Column>
    </Card>
  );

  const notifications = (
    <Card>
      <Column cozy>
        <Typography h4>Notifications</Typography>
        <Switch
          checked={draft.emailNotifications}
          onChange={(next) => set("emailNotifications", next)}
          description="Receive email when important events occur."
        >
          Email notifications
        </Switch>
        <Divider />
        <Switch
          checked={draft.securityAlerts}
          onChange={(next) => set("securityAlerts", next)}
          description="Get notified about suspicious activity."
        >
          Security alerts
        </Switch>
        <Divider />
        <Switch
          checked={draft.weeklyDigest}
          onChange={(next) => set("weeklyDigest", next)}
          description="A summary of activity sent every Monday."
        >
          Weekly digest
        </Switch>
      </Column>
    </Card>
  );

  const content = (
    <Column cozy>
      <Column tight>
        <Typography h4>{SECTIONS[tab].label}</Typography>
        <Typography small>{SECTIONS[tab].blurb}</Typography>
      </Column>
      {tab === 0 ? general : notifications}
      {dirty ? (
        <Card>
          <Row between alignCenter wrap>
            <Typography small>Unsaved changes</Typography>
            <Row snug>
              <Button ghost small onPress={discard}>
                Discard
              </Button>
              <Button primary small onPress={save}>
                Save changes
              </Button>
            </Row>
          </Row>
        </Card>
      ) : null}
    </Column>
  );

  if (narrow) {
    return (
      <Column relaxed>
        {rail}
        {content}
      </Column>
    );
  }
  return (
    <Row relaxed alignStart>
      {rail}
      <Column fill>{content}</Column>
    </Row>
  );
}

export const SETTINGS_TEMPLATE: TemplateDoc = {
  slug: "settings",
  name: "Settings",
  description:
    "Section-railed settings page: workspace form, notification toggles, and a save bar that appears only with unsaved changes. Built from live Canvas components.",
  sections: [
    {
      title: "Settings layout",
      anatomy:
        "Vertical Tabs rail beside the form panes (stacking above them on phones). The General pane holds the workspace Inputs and timezone Select; the Notifications pane holds the Switch list. Editing anything surfaces the save bar; Discard resets to the saved baseline, Save commits it with a toast, and the bar hides again.",
      render: () => <SettingsLive />,
    },
  ],
};
