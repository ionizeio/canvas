# StackedList

Vertical lists with avatar, two-line items, and trailing metadata. Used for contacts, activity feeds, and data previews. Rows can carry a per-item `trailing` slot for an inline control, and `reorderable` adds a leading drag grip per row (keyboard- and screen-reader-operable) that reports each drop through `onReorder` while the order stays controlled by your `items` array.

## Usage

```tsx
<StackedList
  items={[
    { name: "Rachel Chen", detail: "rachel.chen@example.com", meta: "admin" },
    { name: "Ada Lovelace", detail: "ada@example.com", meta: "editor" },
    { name: "Kevin Turner", detail: "kevin@example.com", meta: "viewer" }
  ]}
/>
```

## Variants

### Status tones

```tsx
<StackedList
  items={[
    { name: "Kratos", detail: "Identity", badge: "Healthy", success: true },
    { name: "Hydra", detail: "OAuth2", badge: "Degraded", warning: true },
    { name: "Postgres", detail: "Database", badge: "Down", error: true },
  ]}
/>
```

### Clickable

```tsx
<StackedList
  items={[
    { name: "Rachel Chen", detail: "rachel.chen@example.com", meta: "2h ago" },
    { name: "Ada Lovelace", detail: "ada@example.com", meta: "5h ago" },
    { name: "Kevin Turner", detail: "kevin@example.com", meta: "1d ago" }
  ]}
  clickable
/>
```

### Card

```tsx
<StackedList
  card
  title="Team members"
  items={[
    { name: "Rachel Chen", detail: "Engineering Lead" },
    { name: "Ada Lovelace", detail: "Staff Engineer" }
  ]}
/>
```

### Custom header action

```tsx
<StackedList
  card
  title="Team members"
  action={<Button ghost small>Invite</Button>}
  items={[
    { name: "Rachel Chen", detail: "Engineering Lead" },
    { name: "Ada Lovelace", detail: "Staff Engineer" }
  ]}
/>
```

### Reorderable

Each row gains a leading grip: drag it, or focus it and press Space to grab, the arrow keys to move, Space to drop, Escape to cancel. The order stays controlled: a drop only reports the move (`fromIndex`/`toIndex` plus the new `afterId`/`beforeId` neighbors), and the consumer applies it to its own array.

```tsx
<Stateful initial={[
  { id: "rachel", name: "Rachel Chen", detail: "rachel.chen@example.com" },
  { id: "ada", name: "Ada Lovelace", detail: "ada@example.com" },
  { id: "kevin", name: "Kevin Turner", detail: "kevin@example.com" },
]}>
  {(people, setPeople) => (
    <StackedList
      reorderable
      items={people}
      onReorder={({ fromIndex, toIndex }) => {
        const next = [...people];
        next.splice(toIndex, 0, ...next.splice(fromIndex, 1));
        setPeople(next);
      }}
    />
  )}
</Stateful>
```

### Inline trailing control

A per-item `trailing` slot renders right-aligned before the badge/meta cluster, for an inline editor or affordance. In the `clickable` variant a row carrying the slot moves its press target to the content region, so the control never nests inside the row pressable.

```tsx
<StackedList
  items={[
    { name: "Rachel Chen", detail: "rachel.chen@example.com", trailing: <Chip selectable defaultSelected>Owner</Chip> },
    { name: "Ada Lovelace", detail: "ada@example.com", trailing: <Chip selectable>Owner</Chip>, meta: "editor" },
  ]}
/>
```

## Do & Don't

### Two-line with avatar

**Do** — Primary line bold; secondary line smaller and muted, truncated so long values never wrap.

```tsx
<StackedList items={[
    { name: "Rachel Chen", detail: "rachel.chen@example.com", initials: "RC" }
  ]} />
```

**Don't** — Equal weight on both lines flattens the hierarchy; the email competes with the name.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, overflow: "hidden", ...shadow("sm"), width: "100%", maxWidth: 560 }}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
    <Avatar name="Rachel Chen">RC</Avatar>
    <View style={{ minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: "0%" }}>
      <Text style={{ fontSize: 13.5, fontWeight: "600", color: tokens.foreground }}>Rachel Chen</Text>
      <Text style={{ fontSize: 13.5, fontWeight: "600", color: tokens.foreground }}>rachel.chen@example.com</Text>
    </View>
  </View>
</View>
```

### Clickable

**Do** — Wrap the row in a link with a hover background and a trailing chevron to signal drilldown.

```tsx
<StackedList clickable items={[
    { name: "Ada Lovelace", detail: "ada@example.com", meta: "5h ago", initials: "AL" }
  ]} />
```

**Don't** — A drilldown row with no hover state and no chevron gives no hint it is interactive.

```tsx
<StackedList items={[
    { name: "Ada Lovelace", detail: "ada@example.com", meta: "5h ago", initials: "AL" }
  ]} />
```

### Card surface group

**Do** — Separate the titled header with a rule and give each row a trailing action menu.

```tsx
<StackedList card title="Team members" addAction="Add" rowMenu items={[
    { name: "Rachel Chen", detail: "Engineering Lead", initials: "RC" }
  ]} />
```

**Don't** — A header with no rule blends into the rows, and dropping the per-row action removes the affordance.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, overflow: "hidden", ...shadow("sm"), width: "100%", maxWidth: 560 }}>
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground }}>Team members</Text>
  </View>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
    <Avatar name="Rachel Chen">RC</Avatar>
    <View style={{ minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: "0%" }}>
      <Text style={{ fontSize: 13.5, fontWeight: "600", color: tokens.foreground }}>Rachel Chen</Text>
      <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Engineering Lead</Text>
    </View>
  </View>
</View>
```

### Reorderable rows

**Do** — Give every reorderable row a stable `id` and apply the reported move to your own array: identity is what keeps focus, press state, and the drag announcements attached to the right row.

```tsx
<Stateful initial={[
  { id: "rachel", name: "Rachel Chen", detail: "rachel.chen@example.com" },
  { id: "ada", name: "Ada Lovelace", detail: "ada@example.com" },
]}>
  {(people, setPeople) => (
    <StackedList
      reorderable
      items={people}
      onReorder={({ fromIndex, toIndex }) => {
        const next = [...people];
        next.splice(toIndex, 0, ...next.splice(fromIndex, 1));
        setPeople(next);
      }}
    />
  )}
</Stateful>
```

**Don't** — Don't reorder id-less rows: with the array index as the only key, every drop re-keys the rows under assistive tech and remounts their avatars, and the reported `afterId`/`beforeId` degrade to transient indices no backend can rank by.

```tsx
<StackedList
  reorderable
  items={[
    { name: "Rachel Chen", detail: "rachel.chen@example.com" },
    { name: "Ada Lovelace", detail: "ada@example.com" },
  ]}
  onReorder={() => {}}
/>
```
