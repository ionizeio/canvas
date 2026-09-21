# Command

Cmd+K search: navigation, actions, recent items. The search row is a real
input: typing filters the grouped rows to the matching labels, and a query
that matches nothing shows a muted "No results" row.

In glass mode the triggered palette hands off with the search bar, the way the
iOS 26 menu takes its button: the bar's outline, glyph, label and keycap fade as a
droplet forms hanging under the bar, the palette blooms up out of it over the
bar's spot, recoils and settles resting over the bar's box with its own search
field where the bar was, and on close its rows go inert at once while the pane narrows back to
the bar and the bar fades back. The search editor keeps focus and typing
re-shapes the material without replaying the opening. The bare inline palette
never animates. Reduce Motion settles at once with the bar untouched; solid mode
keeps the ordinary entrance.

The search placeholder names the input and its result list. Supply `accessibilityLabel` when a more specific purpose is needed. `defaultActive={-1}` starts without a highlighted result: Enter selects nothing until navigation or hovering chooses a row. Either arrow key starts at the first result from this state. Controlled indices above the visible result count clamp to the last match; negative, fractional and non-finite indices leave no active result.

## Usage

```tsx
<Command
  trigger
  groups={[
    { heading: "Actions", items: [
      { label: "New File", icon: "file", shortcut: "Ctrl+N" },
      { label: "Open File", icon: "folder", shortcut: "Ctrl+O" },
      { label: "Save", icon: "save", shortcut: "Ctrl+S" }
    ] },
    { heading: "Navigation", items: [
      { label: "Go to Dashboard", icon: "arrowRight" },
      { label: "Go to Settings", icon: "arrowRight" }
    ] }
  ]}
/>
```

## Variants

### Inline

```tsx
<Command
  groups={[
    { heading: "Actions", items: [
      { label: "New File" },
      { label: "Open File" },
      { label: "Save" }
    ] },
    { heading: "Navigation", items: [
      { label: "Go to Dashboard" },
      { label: "Go to Settings" }
    ] }
  ]}
/>
```

### Footer with key hints

```tsx
<Command
  footer
  groups={[
    { heading: "Actions", items: [
      { label: "New File" },
      { label: "Open File" },
      { label: "Save" }
    ] },
    { heading: "Navigation", items: [
      { label: "Go to Dashboard" },
      { label: "Go to Settings" }
    ] }
  ]}
/>
```

### Filtering

Typing narrows the rows; `defaultQuery` seeds the filter (here only the file
actions match), and groups left with no match drop out.

```tsx
<Command
  defaultQuery="file"
  groups={[
    { heading: "Actions", items: [
      { label: "New File" },
      { label: "Open File" },
      { label: "Save" }
    ] },
    { heading: "Navigation", items: [
      { label: "Go to Dashboard" },
      { label: "Go to Settings" }
    ] }
  ]}
/>
```

## Do & Don't

### Trigger

**Do** — Surface the shortcut in a trailing kbd so the trigger advertises the faster keyboard path.

```tsx
<Command trigger />
```

**Don't** — A bare search button hides the keyboard shortcut, so power users never learn the ⌘K entry point.

```tsx
<Pressable style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: "transparent", paddingHorizontal: 12, paddingVertical: 6 }}>
  <Icon search muted size={14} />
  <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>Search...</Text>
</Pressable>
```

### Inline

**Do** — Group commands under labels with separators and highlight the first match so results stay scannable.

```tsx
<Command open defaultActive={0} groups={[
    { heading: "Actions", items: [
      { label: "New File", icon: "file", shortcut: "Ctrl+N" },
      { label: "Save", icon: "save", shortcut: "Ctrl+S" }
    ] },
    { heading: "Navigation", items: [
      { label: "Go to Dashboard", icon: "arrowRight" },
      { label: "Go to Settings", icon: "arrowRight" }
    ] }
  ]} />
```

**Don't** — Dumping every command into one flat list with no labels makes the palette hard to scan.

```tsx
<Command open defaultActive={-1} groups={[
    { items: [
      { label: "New File", icon: "file", shortcut: "Ctrl+N" },
      { label: "Save", icon: "save", shortcut: "Ctrl+S" },
      { label: "Go to Dashboard", icon: "arrowRight" },
      { label: "Go to Settings", icon: "arrowRight" }
    ] }
  ]} />
```
