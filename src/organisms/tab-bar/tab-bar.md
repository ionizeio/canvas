# TabBar

Bottom app navigation: a row of equal-width destinations, each an icon over a short label, with exactly one active. The mobile idiom (iOS HIG tab bar / Material 3 navigation bar), rendered through the glass functional layer.

In glass mode, web and Android move one measured indicator between icon
positions. The web pill remains 48 by 28 points and Android's remains 56 by 32;
restrained deformation stays out of the label area. Icons, labels, destinations
and safe-area spacing remain fixed. iOS keeps its tint-only selection. Reduce
Motion uses the final position immediately, and solid mode retains the ordinary
platform pill.

## Usage

```tsx
<TabBar
  items={[
    { key: "home", label: "Home", icon: (active) => <Icon home size={22} primary={active} muted={!active} /> },
    { key: "search", label: "Search", icon: (active) => <Icon search size={22} primary={active} muted={!active} /> },
    { key: "profile", label: "Profile", icon: (active) => <Icon user size={22} primary={active} muted={!active} /> }
  ]}
/>
```

## Variants

### Controlled

```tsx
<Stateful initial="home">
  {(active, setActive) => (
    <TabBar
      active={active}
      onSelect={setActive}
      items={[
        { key: "home", label: "Home", icon: (active) => <Icon home size={22} primary={active} muted={!active} /> },
        { key: "search", label: "Search", icon: (active) => <Icon search size={22} primary={active} muted={!active} /> },
        { key: "profile", label: "Profile", icon: (active) => <Icon user size={22} primary={active} muted={!active} /> }
      ]}
    />
  )}
</Stateful>
```

## Do & Don't

### Tab Bar

**Do** — Exactly one destination carries the primary tint on both its icon and label, over Material 3's active-indicator pill on web and Android; the rest stay muted, so the current tab is always singular and unmistakable. On web the pill is what lets a bar and a `Sidebar` in the same app shell mark the current destination the same way across the breakpoint that swaps them.

```tsx
<TabBar
  active="home"
  onSelect={() => {}}
  items={[
    { key: "home", label: "Home", icon: (active) => <Icon home size={22} primary={active} muted={!active} /> },
    { key: "search", label: "Search", icon: (active) => <Icon search size={22} primary={active} muted={!active} /> },
    { key: "profile", label: "Profile", icon: (active) => <Icon user size={22} primary={active} muted={!active} /> }
  ]}
/>
```

**Don't** — Tinting every destination primary erases the active indicator: nothing tells you which tab is current.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, paddingTop: 6 }}>
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 }}>
    <Icon home size={22} primary />
    <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: "600", color: tokens.primary }}>Home</Text>
  </View>
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 }}>
    <Icon search size={22} primary />
    <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: "600", color: tokens.primary }}>Search</Text>
  </View>
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 }}>
    <Icon user size={22} primary />
    <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: "600", color: tokens.primary }}>Profile</Text>
  </View>
</View>
```
