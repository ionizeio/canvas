# Select

A pop-up field for picking one option from a list. Pass `label` (and `required`) to name the field: iOS and web render the label above the trigger, while Android floats the Material 3 in-container label once the menu opens or a value is selected. The trigger fills the parent it is given; a step of its own (`xs`, `lg`, …, with `start` to pin it to the leading edge) or a Container step sets its measure.

On the web the Select is Dark Factory's: the trigger is the Input's field (a translucent
well at a 10px corner whose hairline turns violet while the list is open, a 13px semibold
value, the uppercase eyebrow label above) with a 14px chevron, and the list is Dark
Factory's menu, 8px below the trigger, its 33px rows washed under the pointer. The chosen
option is marked in the selection violet, its label and a checkmark in the gutter every row
keeps, never by a fill. A disabled trigger keeps a hairline frame with no fill and a muted
value rather than fading. iOS keeps its pop-up button and the menu's leading check, and
Android the Material 3 exposed dropdown.

In glass mode the option panel is a dense-layer glass card under the trigger (or
above it when it fits there); on the web the trigger is the clear well every web field
is. The trigger stays in place with its value and chevron, and the chosen value and
expanded state commit immediately. Solid mode paints the skin's own panel.

The label also names the option list. Use `accessibilityLabel` to provide an explicit purpose when the visible label or placeholder is insufficient; it overrides both accessible names. A required field announces "required" with the button name and marks the option list as required. The selected value never replaces the field's purpose.

Pass `ref` to access the interactive trigger, preserving overlay measurement. Use `useRef<ComponentRef<typeof Select>>(null)` from React, or `useRef<View>(null)` with React Native's `View` type. Object and callback refs are supported and detach on unmount. Calling `ref.current?.focus()` or `.blur()` delegates to the host without activating the control. Browser focus is supported; native focus depends on the platform and React Native version, and is separate from accessibility focus.

## Usage

```tsx
<Select label="Country" defaultValue="United States" options={["United States", "Canada", "Mexico"]} />
```

## Variants

### Inline label

```tsx
<Select inline label="Rows" defaultValue="10" options={["10", "25", "50"]} />
```

### Required field

```tsx
<Select label="Country" required defaultValue="United States" options={["United States", "Canada", "Mexico"]} />
```

### Small

```tsx
<Select small label="Country" defaultValue="United States" options={["United States", "Canada", "Mexico"]} />
```

### Large

```tsx
<Select large label="Country" defaultValue="United States" options={["United States", "Canada", "Mexico"]} />
```

### Country

```tsx
<Select
  label="Country"
  defaultValue="US"
  options={[
    { value: "US", label: "United States", leading: "🇺🇸" },
    { value: "CA", label: "Canada", leading: "🇨🇦" },
    { value: "GB", label: "United Kingdom", leading: "🇬🇧" },
    { value: "DE", label: "Germany", leading: "🇩🇪" },
    { value: "JP", label: "Japan", leading: "🇯🇵" },
  ]}
/>
```

### With leading icon

```tsx
<Select icon label="Country" defaultValue="United States" options={["United States", "Canada", "Mexico"]} />
```

### Disabled

```tsx
<Select disabled label="Country" defaultValue="United States" options={["United States", "Canada", "Mexico"]} />
```

### Measure

```tsx
<Column snug>
  <Select xs start options={["Small", "Medium", "Large"]} placeholder="xs step, pinned to the start (320)" />
  <Select lg start options={["Small", "Medium", "Large"]} placeholder="lg step, pinned to the start (512)" />
  <Container lg start><Select options={["Small", "Medium", "Large"]} placeholder="Bare, in an lg Container: fills it (512)" /></Container>
</Column>
```

## Do & Don't

**Do** — Use the placeholder prop for the prompt so it can never be submitted as a value.

```tsx
<Column style={{ minHeight: 220 }}>
  <Select open label="Country" placeholder="Choose a country…" options={["United States", "Canada", "Mexico"]} />
</Column>
```

**Don't** — A placeholder as a normal option can be submitted as a real value.

```tsx
<View style={{ minHeight: 260 }}>
  <Select open label="Country" defaultValue="Choose a country…" options={["Choose a country…", "United States", "Canada", "Mexico"]} />
</View>
```

### When to use

**Do** — Reserve a select for picking one of several mutually exclusive options; use a switch or radios for two.

```tsx
<Select label="Status" options={["Active", "Inactive", "Pending", "Archived"]} defaultValue="Active" />
```

**Don't** — A select for a single on/off choice buries a one-tap decision behind a dropdown.

```tsx
<Select label="Email notifications" options={["On", "Off"]} defaultValue="On" />
```

### Small

**Do** — Keep the small select inline with a short label so it stays compact inside toolbars and table footers.

```tsx
<Select small inline label="Rows" defaultValue="10" options={["10", "25", "50"]} />
```

**Don't** — A stacked block label towers over the small control and breaks the dense row it belongs in.

```tsx
<Select small label="Rows per page" defaultValue="10" options={["10", "25", "50"]} />
```

### Default size

**Do** — Match the default select to sibling inputs at the same height so the form row lines up.

```tsx
<Row alignEnd cozy>
  <Column fill>
    <Input label="City" defaultValue="Austin" />
  </Column>
  <Column fill>
    <Select label="State" defaultValue="Texas" options={["Texas", "Oregon"]} />
  </Column>
</Row>
```

**Don't** — A default select next to a taller lg input leaves the row baselines misaligned.

```tsx
<View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, maxWidth: 420 }}>
  <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%" }}>
    <Text style={{ marginBottom: 6, fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: tokens["muted-foreground"] }}>City</Text>
    <Input large accessibilityLabel="City" value="Austin" />
  </View>
  <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%" }}>
    <Text style={{ marginBottom: 6, fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: tokens["muted-foreground"] }}>State</Text>
    <Select value="Texas" options={["Texas", "Oregon"]} />
  </View>
</View>
```

### Large

**Do** — Scale the text up with the height so the large select reads as a deliberate, touch-friendly target.

```tsx
<Select large label="Plan" defaultValue="Starter" options={["Starter", "Pro", "Enterprise"]} />
```

**Don't** — Tiny option text inside a tall control wastes the height and looks like an accidental mismatch.

```tsx
<View>
  <Text style={{ marginBottom: 6, fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: tokens["muted-foreground"] }}>Plan</Text>
  <Pressable style={{ height: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, borderWidth: 1, borderColor: tokens["field-border"], backgroundColor: tokens["field-fill"], paddingHorizontal: 12 }} accessibilityRole="button">
    <Text style={{ fontSize: 11, lineHeight: 15, fontWeight: "600", color: tokens.foreground }}>Starter</Text>
    <Icon chevronDown muted size={11} decorative />
  </Pressable>
</View>
```
