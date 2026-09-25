# Command

Cmd+K search: navigation, actions, recent items. The search row is a real
input: typing filters the grouped rows to the matching labels, and a query
that matches nothing shows a muted "No results" row.

No platform ships a command palette, so every platform draws Dark Factory's: the
palette is its menu panel at the dialog's 18px corner, the search row its search field
(a 15px search glyph beside a 13px semibold query, with a rule under it that turns violet
while the search holds focus), the results its 33px menu rows 2px apart under uppercase
eyebrow headings, the active row on the menu's pressed fill, and the footer a hairline
note of key hints. The collapsed trigger is the Input's field (a translucent well at a
10px corner whose hairline turns violet while the palette is open) holding the search
glyph and a tracked uppercase placeholder. On an iPhone and on Android the rows, the
search row and the trigger grow to the 44pt / 48dp touch minimum, and Android's rows
ripple on press.

In glass mode the triggered palette is a functional-layer glass card under the
search bar, with its own search field; the search editor keeps focus while typing
filters the rows, and the trigger is the clear well every web field is. Solid mode
paints the skin's own palette.

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
<Pressable style={{ flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", height: 40, borderRadius: 10, borderWidth: 1, borderColor: tokens["field-border"], backgroundColor: tokens["field-fill"], paddingHorizontal: 12 }}>
  <Icon search muted size={15} />
  <Text style={{ fontSize: 10.5, lineHeight: 16, fontWeight: "700", letterSpacing: 1.68, textTransform: "uppercase", color: tokens["muted-foreground"] }}>Search...</Text>
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
