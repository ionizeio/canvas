# Drawer

Give a controlled drawer an `accessibilityLabel` when it has no built-in
`trigger`. A drawer with a trigger uses the trigger label as its modal name.

A full-screen panel that slides in from an edge: a navigation drawer, a mobile menu, or a bottom action sheet. Built on React Native's Modal, so it floats over the whole app on iOS, Android, and the web. For a small contextual menu, reach for Dropdown or RowMenu instead.

Drawer provides an overlay host inside its own window. Dropdown, Select, and other anchored children render above the panel without being clipped by its corners; no additional OverlayProvider is needed inside the drawer. A tap outside an open child menu dismisses that menu, and Escape dismisses the child before the drawer. Nested drawers each keep their overlays in their own window.

On iOS, VoiceOver's accessibility escape gesture requests dismissal of the
foremost open child before the drawer. Android system back uses the same child
ownership. A controlled child that stays open continues to own later requests;
one request never falls through to its parent. The scrim remains a pointer
target, and the built-in trigger opens the drawer. Sidebar drill-down navigation
has its own back behavior; accessibility escape dismisses the overlay rather
than navigating a sidebar level. Focus restoration remains platform-dependent.

## Usage

```tsx
<Drawer trigger="Open menu">
  <Column padLoose cozy>
    <Typography lead semibold>Menu</Typography>
    <Button ghost block>Home</Button>
    <Button ghost block>Components</Button>
    <Button ghost block>Settings</Button>
  </Column>
</Drawer>
```

## Variants

### Right

```tsx
<Drawer trigger="Right drawer" right>
  <Column padLoose snug>
    <Typography lead semibold>Details</Typography>
    <Typography small muted>A full-height panel on the right.</Typography>
  </Column>
</Drawer>
```

### Bottom sheet

```tsx
<Drawer trigger="Bottom sheet" bottom>
  <Column padLoose snug>
    <Typography lead semibold>Actions</Typography>
    <Typography small muted>A sheet that rises from the bottom edge.</Typography>
  </Column>
</Drawer>
```

### Top sheet

```tsx
<Drawer trigger="Top sheet" top>
  <Column padLoose snug>
    <Typography lead semibold>What's new</Typography>
    <Typography small muted>A sheet that drops down from the top edge.</Typography>
  </Column>
</Drawer>
```

## Do & Don't

### Right tool for the job

**Do** — Use a Drawer for primary navigation or a full sheet of actions that should take over the screen on a phone.

```tsx
<Drawer trigger="Open navigation" left width={260}>
  <Column padLoose snug>
    <Typography lead semibold>Navigation</Typography>
    <Typography small muted>Home</Typography>
    <Typography small muted>Components</Typography>
  </Column>
</Drawer>
```

**Don't** — Use a full-screen Drawer for a small contextual menu; covering the whole screen for two choices is disorienting. Use a Dropdown or RowMenu anchored to the trigger.

```tsx
<Drawer trigger="Edit" right width={240}>
  <View style={{ padding: 20, gap: 10 }}>
    <Text style={{ fontSize: 14, color: tokens.foreground }}>Rename</Text>
    <Text style={{ fontSize: 14, color: tokens.foreground }}>Delete</Text>
  </View>
</Drawer>
```
