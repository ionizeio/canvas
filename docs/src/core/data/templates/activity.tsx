import { useState } from "react";
import { Row, Column, Card, Typography, Button, Input, Select, Chip, Feed, EmptyState, Icon, useToast } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// Audit log built from real Canvas components: a filter toolbar whose search
// Input and actor Select live-filter the day-grouped activity Feeds below,
// removable filter Chips, and a load-more footer that appends an older day.

interface DayEvent {
  id: string;
  actor: string;
  action: string;
  time: string;
}

interface DayGroup {
  label: string;
  items: DayEvent[];
}

const BASE_GROUPS: DayGroup[] = [
  {
    label: "TODAY",
    items: [
      { id: "t1", actor: "Rachel Chen", action: "revoked API key cnv_live_c41d", time: "2 min ago" },
      { id: "t2", actor: "Ada Lovelace", action: "invited sofia@acme.com as Viewer", time: "1 hour ago" },
      { id: "t3", actor: "System", action: "rotated the webhook signing secret", time: "4 hours ago" },
    ],
  },
  {
    label: "YESTERDAY",
    items: [
      { id: "y1", actor: "Kevin Turner", action: "enabled two-factor authentication", time: "18 hours ago" },
      { id: "y2", actor: "Rachel Chen", action: "changed the workspace name to Acme Corp", time: "22 hours ago" },
      { id: "y3", actor: "System", action: "completed the nightly backup", time: "1 day ago" },
    ],
  },
];

const OLDER_GROUP: DayGroup = {
  label: "EARLIER THIS WEEK",
  items: [
    { id: "e1", actor: "Ada Lovelace", action: "created API key cnv_live_9f2e", time: "3 days ago" },
    { id: "e2", actor: "Kevin Turner", action: "exported the June audit log", time: "4 days ago" },
    { id: "e3", actor: "System", action: "applied platform update 2.14", time: "5 days ago" },
  ],
};

const ACTORS = ["Anyone", "Rachel Chen", "Ada Lovelace", "Kevin Turner", "System"];

interface FilterChip {
  id: string;
  label: string;
  info?: boolean;
}

const INITIAL_CHIPS: FilterChip[] = [
  { id: "event", label: "event: session", info: true },
  { id: "range", label: "last 7 days" },
];

function ActivityLive() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("Anyone");
  const [chips, setChips] = useState<FilterChip[]>(INITIAL_CHIPS);
  const [olderLoaded, setOlderLoaded] = useState(false);

  const groups = olderLoaded ? [...BASE_GROUPS, OLDER_GROUP] : BASE_GROUPS;
  const q = query.trim().toLowerCase();
  const visible = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (event) =>
          (actor === "Anyone" || event.actor === actor) &&
          (q === "" || `${event.actor} ${event.action}`.toLowerCase().includes(q)),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const removeChip = (chip: FilterChip) => {
    setChips((prev) => prev.filter((c) => c.id !== chip.id));
    toast({ message: "Filter removed", description: `"${chip.label}" no longer narrows this log.` });
  };

  return (
    <Column relaxed>
      <Card>
        <Column snug>
          <Row snug wrap alignEnd>
            <Column fill style={{ minWidth: 220 }}>
              <Input
                leadingIcon
                icon="search"
                placeholder="Search events"
                value={query}
                onChangeText={setQuery}
              />
            </Column>
            <Select label="Actor" defaultValue="Anyone" options={ACTORS} onSelect={setActor} />
            <Button
              outline
              onPress={() =>
                toast({
                  success: true,
                  message: "Export started",
                  description: "The filtered audit log is being prepared as a CSV.",
                })
              }
            >
              Export
            </Button>
          </Row>
          {chips.length > 0 && (
            <Row tight wrap>
              {chips.map((chip) => (
                <Chip key={chip.id} info={chip.info} onRemove={() => removeChip(chip)}>
                  {chip.label}
                </Chip>
              ))}
            </Row>
          )}
        </Column>
      </Card>
      {visible.length === 0 ? (
        <EmptyState
          icon={<Icon search />}
          title="No matching events"
          description="No events match the current filters. Clear the search or pick another actor."
        />
      ) : (
        visible.map((group) => (
          <Column snug key={group.label}>
            <Typography tiny semibold>{group.label}</Typography>
            <Feed connector items={group.items} />
          </Column>
        ))
      )}
      <Row center>
        <Button outline small disabled={olderLoaded} onPress={() => setOlderLoaded(true)}>
          Load older events
        </Button>
      </Row>
    </Column>
  );
}

export const ACTIVITY_TEMPLATE: TemplateDoc = {
  slug: "activity",
  name: "Activity",
  description: "Audit log with a filter toolbar and a day-grouped activity timeline. Built from live Canvas components.",
  sections: [
    {
      title: "Audit log",
      anatomy:
        "Filter toolbar (search Input + actor Select live-filter the timeline; removable filter Chips; Export toasts) above one Feed per day group under a muted date heading; a day group with no matches disappears, and the footer Button appends an older day group once, then disables.",
      render: () => <ActivityLive />,
    },
  ],
};
