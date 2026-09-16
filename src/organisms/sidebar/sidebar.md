# Sidebar

App navigation rail with collapsible sections and active highlighting. The sidebar on the left of this page is a thin adapter over this very `Sidebar` component: it feeds the docs' nav tree in and gets the same collapse, accordion, and active-highlight behavior back.

Add `responsive` to make it adapt across breakpoints: it stays the accordion rail on desktop, and at and below the `lg` breakpoint (1024px) it becomes a start-edge (left, RTL-aware) **navigation drawer** that drills through the same `sections` one level at a time (tap a group to slide in to its rows, back to return). Drive the drawer's open state with `open` / `onOpenChange` from your own hamburger button; the `header` and `footer` slots pin above and below the drill-down, just as in the rail. The drawer slides from the start (left) edge by default; `drawerRight`, `drawerTop`, and `drawerBottom` change which edge it slides in from. (This page's own left nav does exactly this: an accordion rail here, a drill-down drawer on a phone.)

## Usage

The one `Sidebar` below is the whole story: on desktop it is the collapsible accordion rail (tap the header chevron to shrink it to icons); narrow the window to a phone and the same component becomes a start-edge drill-down **Liquid Glass menu** opened by the top bar's hamburger, exactly like this page's own left nav. `AppShell` is the docs' live app frame (the top bar and placeholder page); the `Sidebar` wiring is the part you copy.

```tsx
<AppShell>
  {({ open, setOpen }) => (
    <Sidebar
      responsive
      collapsible
      defaultActive="Dashboard"
      open={open}
      onOpenChange={setOpen}
      header={(collapsed) => (collapsed ? <Icon layoutGrid primary size={22} /> : <Typography body semibold>Acme</Typography>)}
      sections={[
        { items: [
          { label: "Dashboard", icon: "layoutGrid" },
          { label: "Inbox", icon: "inbox", badge: "3" }
        ] },
        { title: "Reports", icon: "barChart2", collapsible: true, items: [
          { label: "Analytics", icon: "barChart2" },
          { label: "Traffic", icon: "activity" }
        ] }
      ]}
    />
  )}
</AppShell>
```

## Variants

### Collapsed rail

```tsx
<Sidebar
  bordered
  collapsed
  defaultActive="Dashboard"
  items={[
    { label: "Dashboard", icon: "layoutGrid" },
    { label: "Inbox", icon: "inbox" },
    { label: "Settings", icon: "settings" }
  ]}
/>
```

### Error badge

```tsx
<Sidebar
  bordered
  defaultActive="Dashboard"
  items={[
    { label: "Dashboard", icon: "layoutGrid" },
    { label: "Members", icon: "users" },
    { label: "Security", icon: "shield", badge: "3", badgeError: true }
  ]}
/>
```

## Do & Don't

### Sidebar

**Do** — Exactly one item carries the accent background; clicking moves it so the active page is always unambiguous.

```tsx
<Sidebar bordered defaultActive="Dashboard" sections={[
    { title: "Main", items: [
      { label: "Dashboard", icon: "layoutGrid" },
      { label: "Users", icon: "users", badge: "12" },
      { label: "Settings", icon: "settings" }
    ] }
  ]} />
```

**Don't** — Click an item: two rows wearing the active background means the nav can't tell you which page you're on.

```tsx
<View style={{ width: 240, overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.background }}>
  <View style={{ height: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: tokens.border, paddingHorizontal: 16 }}>
    <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "600", color: tokens.foreground }}>Acme</Text>
  </View>
  <View style={{ gap: 4, padding: 8 }}>
    <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 6, backgroundColor: tokens.accent, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Dashboard</Text>
    </Pressable>
    <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 6, backgroundColor: tokens.accent, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Users</Text>
    </Pressable>
    <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
      <Text style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Settings</Text>
    </Pressable>
  </View>
</View>
```
