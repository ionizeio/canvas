# Tooltip

Small floating helper text on hover or focus.

The bubble inverts against the page (dark in the light scheme, light in the dark one)
and sets its text in Dark Factory's label type; iOS, which has no tooltip, shows the
same bubble, and Android keeps the Material 3 plain tooltip.

The trigger is a boolean axis of its own, resolved first match wins:

- `children`, an element you already have (an icon `Button`, a `Chip`, any
  control that owns its own press and accessible name). The child renders as-is
  and the tip hangs off it through a wrapper that only LISTENS: no accessibility
  role, no tab stop, and no press of its own, so the child stays the single
  interactive, labelled element, keeps its `onPress`, and the tip never toggles
  on tap. Hover and focus on the child both raise it; the hover region is the
  whole tooltip, so moving onto the bubble keeps it up.
- `iconTrigger`, a ghost icon button carrying a settings glyph.
- `textTrigger`, the `trigger` string as a pressable inline word.
- Otherwise the default: the `trigger` string as an outline Button.

Hover and focus are pointer-and-keyboard affordances. Touch pointers are
skipped, and iOS and Android never fire hover at all, so on native and on touch
the controlled `open` prop is the way to show a tip: drive it from whatever the
platform does offer (a long press, a selected row, an inline help toggle). The
built-in triggers additionally toggle on tap; an element trigger deliberately
does not, because that press belongs to the child.

## Usage

```tsx
<Tooltip label="Open settings" trigger="Settings" open />
```

## Variants

### Right

```tsx
<Tooltip label="Open settings" trigger="Settings" open right />
```

### Bottom

```tsx
<Tooltip label="Open settings" trigger="Settings" open bottom />
```

### Left

```tsx
<Tooltip label="Open settings" trigger="Settings" open left />
```

### Icon

```tsx
<Tooltip label="Open settings" iconTrigger open />
```

### Text

```tsx
<Tooltip textTrigger label="Open settings" trigger="hover this text" open />
```

### Element trigger

```tsx
<Tooltip label="Open settings" open>
  <Button ghost icon accessibilityLabel="Open settings" iconLeft={<Icon settings size={16} />} />
</Tooltip>
```

### On hover

```tsx
<Tooltip label="Open settings" trigger="Hover me" />
```

## Do & Don't

**Do** — Keep tooltips short and supplementary; put essential steps in visible copy.

```tsx
<Tooltip iconTrigger bottom open label="Rotate key" />
```

**Don't** — Long, essential instructions hidden in a tooltip are missed on touch and by screen readers.

```tsx
<Tooltip iconTrigger bottom open label="To rotate this key you must first revoke the old one in Settings, then confirm via email within 24 hours." />
```

### top

**Do** — Leave headroom above (or flip to bottom) so a top-placed tooltip stays fully on screen.

```tsx
<Tooltip trigger="Save" top open label="Saves your changes" />
```

**Don't** — A top tooltip on a trigger near the top edge clips above the viewport and goes unread.

```tsx
<View style={{ overflow: "hidden", alignItems: "flex-start" }}>
  <View style={{ marginTop: -16 }}>
    <Tooltip trigger="Save" top open label="Saves your changes" />
  </View>
</View>
```

### right

**Do** — Keep room to the right, or flip the tooltip to the left when the trigger hugs the edge.

```tsx
<Tooltip iconTrigger right open label="More info" />
```

**Don't** — A right tooltip on a control flush against the right edge is cut off by the container.

```tsx
<View style={{ alignItems: "flex-end" }}>
  <Tooltip iconTrigger right open label="More info" />
</View>
```

### bottom

**Do** — Give a bottom tooltip clearance so it never overlaps the interactive content below.

```tsx
<Tooltip trigger="Filters" bottom open label="Refine results" />
```

**Don't** — A bottom tooltip sits right on top of the next row, masking the control beneath it.

```tsx
<View style={{ alignItems: "flex-start", gap: 0 }}>
  <Tooltip trigger="Filters" bottom open label="Refine results" />
  <Button outline small style={{ marginTop: -12 }}>Clear all</Button>
</View>
```

### left

**Do** — Reserve space on the left, or flip to the right, so a left-placed tooltip is never cut off.

```tsx
<Tooltip iconTrigger left open label="Need help?" />
```

**Don't** — A left tooltip on a trigger at the left edge is clipped by the container's left boundary.

```tsx
<View style={{ overflow: "hidden", alignItems: "flex-start" }}>
  <View style={{ marginLeft: -44 }}>
    <Tooltip iconTrigger left open label="Need help?" />
  </View>
</View>
```
