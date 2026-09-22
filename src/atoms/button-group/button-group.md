# ButtonGroup

Segmented controls, split buttons, attached groups.

All four kinds follow the theme's surface mode. Toggle Liquid Glass in the docs,
or use `<ThemeProvider glass>` in an app: segmented groups paint a glass
selection pill on the selected segment, split and stepper groups share a glass
capsule, and spaced peers get individual glass surfaces. Solid mode keeps each
platform's existing skin. The material uses native Liquid Glass on supported iOS
versions, the native blur or tint fallback on Android and older iOS, and
Canvas's lens on Chromium. Reduce Transparency and Increase Contrast use the
shared material's opaque fallbacks.

## Usage

```tsx
<ButtonGroup items={["Day", "Week", "Month"]} />
```

## Variants

### Small

```tsx
<ButtonGroup items={["Day", "Week", "Month"]} small />
```

### Large

```tsx
<ButtonGroup items={["Day", "Week", "Month"]} large />
```

### Disabled

```tsx
<ButtonGroup items={["Day", "Week", "Month"]} disabled />
```

### Block

```tsx
<ButtonGroup items={["Day", "Week", "Month"]} block />
```

### Block spaced

```tsx
<ButtonGroup spaced items={["Edit", "Duplicate", "Archive"]} block />
```

### Measure

```tsx
<Container>
  <Column>
    <ButtonGroup items={["Day", "Week", "Month"]} xs start />
    <ButtonGroup spaced items={["Edit", "Duplicate", "Archive"]} md />
  </Column>
</Container>
```

### Stepper

```tsx
<ButtonGroup stepper items={["Yesterday", "Today", "Tomorrow"]} />
```

### Split

```tsx
<ButtonGroup split items={["Save"]} menu={["Save as draft", "Save and close", "Save a copy"]} />
```

In glass mode the split menu is a dense-layer glass card under the group, whose
shared glass, primary label, divider and chevron stay in place. The primary action
and the chevron stay two fixed targets throughout, and a group disabled while its
menu is open closes it. Solid mode paints the skin's own menu.

### Icon segments

An item may pair its label with a kit glyph (`{ label, icon }`); `iconsOnly`
renders each segment as the glyph alone, with the label as the segment's
accessible name. An icon-only segmented control: a view switcher, a
form-factor switcher.

```tsx
<ButtonGroup
  iconsOnly
  items={[
    { label: "Phone width", icon: "smartphone" },
    { label: "Tablet width", icon: "tablet" },
    { label: "Desktop width", icon: "monitor" }
  ]}
/>
```

## Do & Don't

### Segmented

**Do** — Keep a segmented control to a few mutually-exclusive views.

```tsx
<ButtonGroup segmented defaultActive={0} items={["Day", "Week", "Month"]} />
```

**Don't** — Past ~4 options a segmented control gets cramped and hard to scan; reach for a select.

```tsx
<ButtonGroup segmented defaultActive={0} items={["Day", "Week", "Month", "Quarter", "Year", "5Y", "All"]} />
```

### Attached

**Do** — Reserve attached groups for closely-related actions like prev / today / next.

```tsx
<ButtonGroup stepper active={1} items={["Yesterday", "Today", "Tomorrow"]} />
```

**Don't** — Attaching unrelated actions implies they belong to one control.

```tsx
<ButtonGroup segmented defaultActive={-1} items={["Save", "Delete", "Export"]} />
```

### Split

**Do** — Separate the chevron with a hairline so the secondary menu reads as distinct.

```tsx
<ButtonGroup split items={["Save"]} menu={["Save as draft", "Save and close", "Save a copy"]} />
```

**Don't** — With no divider the chevron looks like part of one button, hiding the menu.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start" }}>
  <Pressable
    style={({ pressed }) => [
      { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, paddingHorizontal: 16, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, borderTopRightRadius: 0, borderBottomRightRadius: 0, backgroundColor: tokens.primary },
      pressed ? { opacity: 0.9 } : null
    ]}
  >
    <Text style={{ fontWeight: "500", fontSize: 14, lineHeight: 20, color: tokens["primary-foreground"] }}>Save</Text>
  </Pressable>
  <Pressable
    style={({ pressed }) => [
      { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 36, paddingHorizontal: 8, borderTopRightRadius: 6, borderBottomRightRadius: 6, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, backgroundColor: tokens.primary },
      pressed ? { opacity: 0.9 } : null
    ]}
  >
    <Icon chevronDown primaryForeground size={16} />
  </Pressable>
</View>
```
