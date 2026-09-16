# Chip

An interactive pill for filter chips, tags, and selectable tokens. A Chip is a
LOW-emphasis tag, not a call to action, so it never wears a saturated button fill:
every chip is a soft tint (a light wash, a subtle border, and strong text; reversed
in dark, the same recipe Badge's status pills use). It carries an optional leading
icon and a label, becomes tappable with `onPress`, and grows a trailing "×" remove
button with `onRemove`, so no call site hand-composes a `borderRadius` +
`backgroundColor` + padding Pressable.

Two orthogonal axes drive the look:

- **Color** (pick one; default the neutral tag). A semantic status (`success`,
  `warning`, `destructive`, `info`, `neutral`) or a free-form palette hue (`red`,
  `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`,
  `blue`, `indigo`, `violet`, `fuchsia`, `purple`, `pink`, `rose`, `gray`). Status
  names alias a hue (`success` → green, `warning` → amber, `destructive` → red, `info` →
  blue), so they match Badge and their literal hue. Precedence when more than one is
  set: status names first, then hues in the order above.
- **Emphasis**. `outline` drops the fill for a border-only chip in the same hue;
  `primary` is the brand-accent (indigo) tint and the state a selectable chip lights
  up to. These compose with any color, e.g. `<Chip blue outline>`.

## Usage

```tsx
<Chip>Design</Chip>
```

## Variants

### Colors

```tsx
<Row wrap>
  <Chip red>Bug</Chip>
  <Chip orange>Chore</Chip>
  <Chip amber>Docs</Chip>
  <Chip green>Feature</Chip>
  <Chip teal>Design</Chip>
  <Chip blue>Backend</Chip>
  <Chip indigo>Frontend</Chip>
  <Chip violet>Research</Chip>
  <Chip purple>Infra</Chip>
  <Chip pink>Growth</Chip>
  <Chip gray>Archived</Chip>
</Row>
```

### Status

```tsx
<Row wrap>
  <Chip success>Passing</Chip>
  <Chip warning>Flaky</Chip>
  <Chip destructive>Failing</Chip>
  <Chip info>Queued</Chip>
  <Chip neutral>Skipped</Chip>
</Row>
```

### Emphasis

```tsx
<Row>
  <Chip>Neutral</Chip>
  <Chip primary>Accent</Chip>
  <Chip outline>Outline</Chip>
</Row>
```

### With leading icon

A leading `<Icon />` is auto-tinted to the chip's color, so a bare `<Icon check />`
matches without threading the color through.

```tsx
<Chip success icon={<Icon check size={14} />}>Verified</Chip>
```

### Removable filters

`onRemove` grows the trailing "×"; wire it to your own state to drop the filter.

```tsx
<Chip onRemove={() => {}}>Role: Admin</Chip>
```

### Selectable

Give a selectable chip an `outline` base so its unselected (border-only) and
selected (filled tint) states read apart.

```tsx
<Row>
  <Chip selectable outline defaultSelected>Design</Chip>
  <Chip selectable outline>Engineering</Chip>
</Row>
```

## Do & Don't

### Removable filter

**Do** — Use a Chip with `onRemove` so the pill and its "×" stay consistent and accessible.

```tsx
<Chip blue onRemove={() => {}}>Status: Active</Chip>
```

**Don't** — Hand-build the pill from a raw Pressable with border-radius, padding, and a text "×".

```tsx
<Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 9999, backgroundColor: "#4f46e5", paddingHorizontal: 10, paddingVertical: 4 }}>
  <Text style={{ color: "#ffffff", fontSize: 13 }}>Status: Active</Text>
  <Text style={{ color: "#ffffff", fontSize: 13 }}>×</Text>
</Pressable>
```
