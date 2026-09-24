# Dropdown

Floating menus triggered by a button: actions, options, navigation.

On the web the menu is Dark Factory's: a card of bold rows that take the hover wash
at once, an uppercase eyebrow over a section, muted shortcuts in their own column, and a
disabled row in the muted ink rather than faded. iOS and Android keep their platform
menus (the iOS pull-down menu, the Material 3 menu) in the theme's colours.

In glass mode the menu is a dense-layer glass card under its trigger (or above it
when it fits there); the trigger keeps its place, its press and its accessible
name and state, and a selection commits and closes the menu the moment a row is
pressed. AvatarMenu and the collapsed Navbar menu are built on Dropdown. Solid
mode paints the skin's own menu.

## Usage

```tsx
<Dropdown
  trigger="Actions"
  items={[
    { label: "Edit profile" },
    { label: "Duplicate" },
    { label: "Settings" }
  ]}
/>
```

## Variants

### Disabled trigger

```tsx
<Dropdown
  trigger="Actions"
  disabled
  items={[
    { label: "Edit profile" },
    { label: "Duplicate" },
    { label: "Settings" }
  ]}
/>
```

### Disabled item

```tsx
<Dropdown
  trigger="Actions"
  items={[
    { label: "Edit profile" },
    { label: "Duplicate" },
    { label: "Archive", disabled: true }
  ]}
/>
```

### Destructive item

```tsx
<Dropdown
  trigger="Actions"
  items={[
    { label: "Edit profile" },
    { label: "Duplicate" },
    { label: "Delete…", destructive: true, separatorBefore: true }
  ]}
/>
```

### Section label

```tsx
<Dropdown
  trigger="Actions"
  label="Actions"
  items={[
    { label: "Edit profile" },
    { label: "Duplicate" },
    { label: "Settings" }
  ]}
/>
```

### Identity header

```tsx
<Dropdown
  trigger="Account"
  title="Rachel Chen"
  description="rachel@nannier.com"
  items={[
    { label: "Profile" },
    { label: "Settings" },
    { label: "Log out" }
  ]}
/>
```

### Keyboard shortcuts

```tsx
<Dropdown
  trigger="Actions"
  items={[
    { label: "Edit profile", shortcut: "⌘E" },
    { label: "Duplicate", shortcut: "⌘D" },
    { label: "Settings", shortcut: "⌘," }
  ]}
/>
```

### Custom trigger

```tsx
<Dropdown
  items={[
    { label: "Profile" },
    { label: "Settings" },
    { label: "Log out" }
  ]}
>
  <Avatar name="Rachel Chen" />
</Dropdown>
```

### End alignment

```tsx
<Dropdown
  trigger="Account"
  alignEnd
  items={[
    { label: "Profile" },
    { label: "Settings" },
    { label: "Log out" }
  ]}
/>
```

## Do & Don't

### Trigger

**Do** — Click Actions to open; click outside to dismiss.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "Edit profile" },
    { label: "Duplicate" },
    { label: "Settings" }
  ]} />
```

**Don't** — Always open: it clutters the page and there's no way to dismiss it.

```tsx
<Column style={{ minHeight: 190 }}>
  <Dropdown trigger="Actions" open items={[
      { label: "Edit profile" },
      { label: "Duplicate" },
      { label: "Settings" }
    ]} />
</Column>
```

### Sectioning

**Do** — Click an item: group related actions under labels with a separator.

```tsx
<Dropdown trigger="Actions" label="Create" items={[
    { label: "New file" },
    { label: "New folder" },
    { label: "Upload" },
    { label: "Rename", separatorBefore: true },
    { label: "Move to…" },
    { label: "Download" }
  ]} />
```

**Don't** — Click an item: a long, flat menu of eight actions is hard to scan.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "New file" },
    { label: "New folder" },
    { label: "Upload" },
    { label: "Rename" },
    { label: "Duplicate" },
    { label: "Move to…" },
    { label: "Download" },
    { label: "Delete" }
  ]} />
```

### Leading icons

**Do** — Click an item: give every row a leading icon so labels share one start column.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "Edit", icon: "pencil" },
    { label: "Duplicate", icon: "copy" },
    { label: "Settings", icon: "settings" }
  ]} />
```

**Don't** — Click an item: icons on some rows but not others leave labels misaligned and the column ragged.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "Edit", icon: "pencil" },
    { label: "Duplicate" },
    { label: "Settings", icon: "settings" }
  ]} />
```

### Keyboard shortcuts

**Do** — Click an item: push shortcuts to a muted, right-aligned column so the eye can scan them.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "Edit profile", shortcut: "⌘E" },
    { label: "Duplicate", shortcut: "⌘D" },
    { label: "Settings", shortcut: "⌘," }
  ]} />
```

**Don't** — Click an item: hints inline after the label crowd the text and never line up into a readable column.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "Edit profile ⌘E" },
    { label: "Duplicate ⌘D" },
    { label: "Settings ⌘," }
  ]} />
```

### Disabled item

**Do** — Click Archive: nothing happens; a real disabled item doesn't respond.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "Edit" },
    { label: "Archive", disabled: true },
    { label: "Duplicate" }
  ]} />
```

**Don't** — Click Archive: it looks disabled but still fires, a greyed item that works is a trap.

```tsx
<View style={{ alignSelf: "flex-start", gap: 2, borderRadius: 12, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.popover, padding: 8, ...shadow("lg"), minWidth: 200 }}>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }, pressed ? { backgroundColor: tokens.accent } : null]}>
    <Text style={{ fontSize: 12.5, lineHeight: 17, fontWeight: "700", color: tokens["popover-foreground"] }}>Edit</Text>
  </Pressable>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }, pressed ? { backgroundColor: tokens.accent } : null]}>
    <Text style={{ fontSize: 12.5, lineHeight: 17, fontWeight: "700", color: tokens["muted-foreground"] }}>Archive</Text>
  </Pressable>
  <Pressable style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }, pressed ? { backgroundColor: tokens.accent } : null]}>
    <Text style={{ fontSize: 12.5, lineHeight: 17, fontWeight: "700", color: tokens["popover-foreground"] }}>Duplicate</Text>
  </Pressable>
</View>
```

### Destructive item

**Do** — Click an item: separate destructive actions with a divider, color them, and place them last.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "Edit" },
    { label: "Duplicate" },
    { label: "Delete", destructive: true, separatorBefore: true }
  ]} />
```

**Don't** — Click an item: a destructive action wedged between routine ones invites a costly misclick.

```tsx
<Dropdown trigger="Actions" items={[
    { label: "Edit" },
    { label: "Delete" },
    { label: "Duplicate" }
  ]} />
```
