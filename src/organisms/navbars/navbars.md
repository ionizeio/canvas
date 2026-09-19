# Navbar

Topbars with a brand, navigation links, and an action button. Used as the
primary app-level navigation. The bar measures its own width: at and below the
`sm` breakpoint (640) the links row automatically collapses into a menu button
opening a dropdown of the same links (the active one checkmarked), so links
never clip off a phone screen; `active` and `onSelect` keep their contract in
both renderings. In glass mode the active link's fill travels between the links as
one measured surface with restrained stretch, recoil and settle (the labels,
`aria-current`, focus and hit targets stay fixed; iOS keeps its inactive capsules and
carries the brand fill as glass, web and Android carry their tinted tile), the
collapsed menu is Dropdown's, so it opens and closes with Dropdown's liquid material
and its hand-off (the hamburger fades as the menu's material forms on its frame and
returns as the menu shrinks back into it) while the bar itself stays still, and a
collapse retires the surface until the row measures again. Reduce Motion selects the final bounds at once; solid mode keeps
the skin's own active tile. Either cluster takes a caller-supplied element beside its
built-in parts: `brandContent` leads the left one with a logo mark (beside or
instead of the `brand` wordmark) and `actions` leads the right one with
free-form trailing controls, ahead of `actionLabel` and `avatar`. `links` is
optional, so a console topbar with no middle nav renders neither the links row
nor the menu button that stands in for it.

## Usage

```tsx
<Navbar
  brand="Canvas"
  links={["Dashboard", "Users", "Settings"]}
  actionLabel="New"
  avatar="RC"
/>
```

## Variants

### Bordered

```tsx
<Navbar bordered brand="Canvas" links={["Dashboard", "Users", "Settings"]} />
```

### Floating

```tsx
<Navbar floating brand="Canvas" links={["Dashboard", "Users", "Settings"]} />
```

### Console topbar

```tsx
<Navbar
  brandContent={<Icon layers />}
  actions={<Button ghost small icon accessibilityLabel="Search" iconLeft={<Icon search size={16} />} />}
  avatar="RC"
/>
```

## Do & Don't

### Brand element

**Do**: Pass the mark through `brandContent`, so the bar owns the whole brand group and the wordmark keeps its own type.

```tsx
<Navbar bordered brandContent={<Icon layers size={20} />} brand="Console" links={["Overview", "Access", "Audit"]} avatar="RC" />
```

**Don't**: Folding the mark into the wordmark string leaves it as text, stuck in the title's size and color.

```tsx
<Navbar bordered brand="◆ Console" links={["Overview", "Access", "Audit"]} avatar="RC" />
```

### Standard topbar

**Do** — Keep a few primary links inline and fold the rest behind a More menu.

```tsx
<Navbar bordered brand="Canvas" defaultActive={0} links={["Dashboard", "Users", "Settings"]} actionLabel="New" avatar="RC" />
```

**Don't** — Cramming every destination into the bar wraps the row and buries the primary links.

```tsx
<Navbar bordered brand="Canvas" defaultActive={0} links={[
    "Dashboard",
    "Users",
    "Settings",
    "Billing",
    "Reports",
    "Integrations",
    "Audit",
    "Webhooks"
  ]} avatar="RC" />
```

### With search bar

**Do** — Use a button that opens the command palette and advertise the ⌘K shortcut.

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <Row alignCenter snug pad style={{ height: 56 }}>
    <Typography small semibold>Canvas</Typography>
    <Container sm start>
      <Button outline block iconLeft={<Icon search muted size={13} />} iconRight={<Kbd>⌘K</Kbd>}>Search…</Button>
    </Container>
  </Row>
</Card>
```

**Don't** — A live text field in the bar reads as a form input and offers no keyboard affordance.

```tsx
<View style={{ width: "100%", overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: tokens.border }}>
  <View style={{ flexDirection: "row", height: 56, alignItems: "center", gap: 8, backgroundColor: tokens.card, paddingHorizontal: 16 }}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground }}>Canvas</Text>
    <View style={{ marginHorizontal: 16, maxWidth: 400, flexGrow: 1, flexShrink: 1, flexBasis: "0%" }}>
      <TextInput placeholder="Search…" style={{ height: 36, width: "100%", borderRadius: 6, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.background, paddingHorizontal: 12, paddingVertical: 4, fontSize: 14, lineHeight: 20, color: tokens.foreground }} />
    </View>
  </View>
</View>
```

### Mobile

**Do** — Collapse the links into a hamburger and keep only the logo and avatar in the bar.

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <Row alignCenter snug pad style={{ height: 56 }}>
    <Button ghost iconLeft={<Icon menu muted size={18} />} accessibilityLabel="Open menu" />
    <Typography small semibold>Canvas</Typography>
    <Column grow />
    <Avatar small src="/rachel-chen.jpg" name="RC" />
  </Row>
</Card>
```

**Don't** — A full horizontal nav at phone width wraps onto a second row and crowds out the logo.

```tsx
<View style={{ width: "100%", maxWidth: 360, overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: tokens.border }}>
  <View style={{ flexDirection: "row", height: 56, alignItems: "center", gap: 4, backgroundColor: tokens.card, paddingHorizontal: 12 }}>
    <Text style={{ fontSize: 13, fontWeight: "600", color: tokens.foreground }}>Canvas</Text>
    <View style={{ marginLeft: 8, flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
      <Pressable style={({ pressed }) => [{ borderRadius: 6, backgroundColor: tokens.accent, paddingHorizontal: 12, paddingVertical: 6 }, pressed ? { opacity: 0.9 } : null]}>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Dashboard</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }, pressed ? { opacity: 0.9 } : null]}>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["muted-foreground"] }}>Users</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }, pressed ? { opacity: 0.9 } : null]}>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["muted-foreground"] }}>Settings</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [{ borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }, pressed ? { opacity: 0.9 } : null]}>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["muted-foreground"] }}>Billing</Text>
      </Pressable>
    </View>
  </View>
</View>
```
