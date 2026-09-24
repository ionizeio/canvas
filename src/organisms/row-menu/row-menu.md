# RowMenu

Vertical action menu items and navigation links.

On the web the ··· trigger is Dark Factory's plain icon button, a small square with a
muted glyph that takes the hover wash, and it opens Dark Factory's menu, the same one
Dropdown opens. iOS and Android keep their platform context menus in the theme's
colours.

In glass mode the menu is a dense-layer glass card beside its glyph; a row's
callback fires the moment it is pressed. Solid mode paints the skin's own menu.
Board's card menus are RowMenus and behave the same.

## Usage

```tsx
<RowMenu
  items={[
    { label: "Edit" },
    { label: "Duplicate" },
    { label: "Delete", destructive: true, separatorBefore: true }
  ]}
/>
```

## Variants

### Links

```tsx
<RowMenu links items={[{ label: "Profile" }, { label: "Billing" }, { label: "Members" }]} />
```

### Section label

```tsx
<RowMenu sectionLabel="Actions" items={[{ label: "Edit" }, { label: "Duplicate" }, { label: "Rename" }]} />
```

### Leading icons

```tsx
<RowMenu
  items={[
    { label: "Edit", icon: "pencil" },
    { label: "Duplicate", icon: "copy" },
    { label: "Settings", icon: "settings" }
  ]}
/>
```

### Disabled item

Mark an item `disabled` when its action is unavailable in the current context; the row dims,
does not fire `onSelect`, keeps the menu open, and is announced as disabled.

```tsx
<RowMenu items={[{ label: "Edit" }, { label: "Duplicate" }, { label: "Clear column", disabled: true }]} />
```

## Do & Don't

### When to use

**Do** — Collapse per-row actions behind a ··· trigger; keep Delete separated and danger-colored.

```tsx
<RowMenu open sectionLabel="Actions" items={[
    { label: "Edit", icon: "pencil" },
    { label: "Duplicate", icon: "copy" },
    { label: "Delete", icon: "trash", destructive: true, separatorBefore: true }
  ]} />
```

**Don't** — Splaying every row action inline multiplies visual noise across every table row.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
  <Button ghost small>Edit</Button>
  <Button ghost small>Duplicate</Button>
  <Button destructive small>Delete</Button>
</View>
```

### Actions

**Do** — Click an item: place destructive actions last, color them, and split them off with a divider.

```tsx
<RowMenu open items={[
    { label: "Edit" },
    { label: "Duplicate" },
    { label: "Delete", destructive: true, separatorBefore: true }
  ]} />
```

**Don't** — Click an item: a destructive action sandwiched between routine ones invites a costly misclick.

```tsx
<RowMenu open items={[
    { label: "Edit" },
    { label: "Delete", destructive: true },
    { label: "Duplicate" }
  ]} />
```

### Links

**Do** — Pass `links` so rows render as real navigation links a browser can open in a new tab or bookmark.

```tsx
<RowMenu open links items={[
    { label: "Profile" },
    { label: "Billing" },
    { label: "Members" }
  ]} />
```

**Don't** — Buttons can't be opened in a new tab, bookmarked, or middle-clicked, navigation needs real links.

```tsx
<RowMenu open items={[
    { label: "Profile" },
    { label: "Billing" },
    { label: "Members" }
  ]} />
```
