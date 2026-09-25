# Tabs

Underline, pill, vertical, with badges.

In glass mode a filled selection is a control-layer pane behind the selected
label, in the platform skin's selected tint with readable foreground ink. iOS
and web share the capsule segmented control; Android underline tabs keep their
ink indicator. Solid mode keeps the complete platform treatment.

## Usage

```tsx
<Tabs tabs={["General", "Security", "Notifications"]} />
```

## Variants

### Pill

```tsx
<Tabs pills tabs={["All", "Active", "Archived"]} />
```

### Vertical

```tsx
<Tabs vertical tabs={["General", "Security", "Notifications"]} />
```

### Responsive vertical

`responsive` renders a vertical rail as the horizontal underline look when the
component's own container is at or below `sm` (640): container-measured, so a
settings rail inside a narrow column flattens to a top tab bar instead of
starving the panel beside it.

```tsx
<Tabs vertical responsive tabs={["General", "Security", "Notifications"]} />
```

### Badge counts

```tsx
<Tabs tabs={[{ label: "All", badge: "142" }, { label: "Active", badge: "89" }, { label: "Archived", badge: "53" }]} />
```

### Disabled tab

```tsx
<Tabs tabs={["Overview", { label: "Billing", disabled: true }, "Settings"]} />
```

### Block

```tsx
<Tabs block tabs={["Overview", "Activity", "Settings"]} />
```

### Scrollable overflow

A row longer than its container pans horizontally instead of clipping, at any
container width and with no prop: the scroller is inert while the row fits,
and on Android it then takes no sideways drag either, so a tap that drifts
sideways still selects its tab and a swipe that starts across the row scrolls
the page (while TalkBack explores by touch the scroller stays enabled, so the
exploring finger reaches every tab). Selecting a tab (press or arrow key)
scrolls it fully into view with a sliver of its neighbor left showing. `block` shares the row equally and never
overflows; a vertical rail stacks instead.

```tsx
<Tabs tabs={["General", "Security", "Notifications", "Billing", "Integrations", "Advanced"]} />
```

### Wrapped overflow

`wrap` lays a row longer than its container out on further lines inside one
track instead of panning it, so every tab is on screen at once: the track fills
its container and grows taller, its corners staying concentric with the pills.
Reach for it where the strip is a page's own navigation on a phone (the docs
example rail); keep the scroller where the strip sits in a toolbar that must stay
one line tall. `block` never overflows and wins over `wrap`; a `responsive`
vertical rail honors `wrap` once it flattens.

```tsx
<Tabs wrap tabs={["General", "Security", "Notifications", "Billing", "Integrations", "Advanced", "Members", "Audit log"]} />
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
