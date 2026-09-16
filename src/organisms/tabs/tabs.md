# Tabs

Underline, pill, vertical, with badges.

## Usage

```tsx
<Tabs
  tabs={[
    "General",
    "Security",
    "Notifications",
    "Billing",
    "Integrations"
  ]}
  defaultActive={0}
/>
```

## Variants

### Pill

```tsx
<Tabs pills tabs={["All", "Active", "Archived", "Deleted"]} defaultActive={0} />
```

### Vertical

```tsx
<Tabs
  vertical
  tabs={["General", "Security", "Notifications", "API Keys", "Billing"]}
  defaultActive={0}
/>
```

### Responsive vertical

`responsive` renders a vertical rail as the horizontal underline look when the
component's own container is at or below `sm` (640): container-measured, so a
settings rail inside a narrow column flattens to a top tab bar instead of
starving the panel beside it.

```tsx
<Tabs
  vertical
  responsive
  tabs={["General", "Security", "Notifications", "API Keys", "Billing"]}
  defaultActive={0}
/>
```

### Badge counts

```tsx
<Tabs
  tabs={[
    { label: "All", badge: "142" },
    { label: "Active", badge: "89" },
    { label: "Pending", badge: "12" },
    { label: "Archived", badge: "53" }
  ]}
  defaultActive={0}
/>
```

### Disabled tab

```tsx
<Tabs
  tabs={[
    "Overview",
    "Activity",
    { label: "Billing", disabled: true },
    "Settings"
  ]}
  defaultActive={0}
/>
```

### Block

```tsx
<Tabs block tabs={["Overview", "Activity", "Settings"]} defaultActive={0} />
```

### Scrollable overflow

A row longer than its container pans horizontally instead of clipping, at any
container width and with no prop: the scroller is inert while the row fits.
Selecting a tab (press or arrow key) scrolls it fully into view with a sliver
of its neighbor left showing. `block` shares the row equally and never
overflows; a vertical rail stacks instead.

```tsx
<Tabs
  tabs={[
    "General",
    "Security",
    "Notifications",
    "Billing",
    "Integrations",
    "Advanced"
  ]}
  defaultActive={0}
/>
```

## Do & Don't

### Underline

**Do** — Underline and foreground-color only the active tab; leave the rest muted with no rule.

```tsx
<Tabs tabs={["Overview", "Activity", "Settings"]} defaultActive={0} />
```

**Don't** — Underlining every tab erases the active indicator: there is no way to tell which view is current.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: tokens.border, alignSelf: "flex-start" }}>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Overview</Text>
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 9999, backgroundColor: tokens.primary }} />
  </Pressable>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Activity</Text>
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 9999, backgroundColor: tokens.primary }} />
  </Pressable>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Settings</Text>
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 9999, backgroundColor: tokens.primary }} />
  </Pressable>
</View>
```

### Pill

**Do** — Exactly one pill gets the elevated background; the rest sit flat on the muted track.

```tsx
<Tabs tabs={["All", "Active", "Archived"]} defaultActive={0} pills />
```

**Don't** — Giving every pill the raised background makes the group read as three buttons, not one selection.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 8, backgroundColor: tokens.muted, padding: 4 }}>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: tokens.background, ...shadow("sm"), paddingHorizontal: 12, paddingVertical: 6 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>All</Text>
  </Pressable>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: tokens.background, ...shadow("sm"), paddingHorizontal: 12, paddingVertical: 6 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Active</Text>
  </Pressable>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: tokens.background, ...shadow("sm"), paddingHorizontal: 12, paddingVertical: 6 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Archived</Text>
  </Pressable>
</View>
```

### Vertical

**Do** — Fill the active rail item with the accent background so the selected pane is unmistakable.

```tsx
<Tabs tabs={["General", "Security", "Notifications"]} defaultActive={0} vertical />
```

**Don't** — With no filled active item the rail collapses into a plain link list and loses its current selection.

```tsx
<View style={{ flexDirection: "column", alignItems: "stretch", gap: 4, width: 180 }}>
  <Pressable style={({ pressed }) => [{ width: "100%", flexDirection: "row", alignItems: "center", borderRadius: 6, backgroundColor: "transparent", paddingHorizontal: 12, paddingVertical: 8 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["muted-foreground"] }}>General</Text>
  </Pressable>
  <Pressable style={({ pressed }) => [{ width: "100%", flexDirection: "row", alignItems: "center", borderRadius: 6, backgroundColor: "transparent", paddingHorizontal: 12, paddingVertical: 8 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["muted-foreground"] }}>Security</Text>
  </Pressable>
  <Pressable style={({ pressed }) => [{ width: "100%", flexDirection: "row", alignItems: "center", borderRadius: 6, backgroundColor: "transparent", paddingHorizontal: 12, paddingVertical: 8 }, pressed ? { opacity: 0.9 } : null]}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["muted-foreground"] }}>Notifications</Text>
  </Pressable>
</View>
```
