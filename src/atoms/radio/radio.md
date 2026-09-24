# Radio

Single-pick selection: stacked, inline, card-style.

One job, a platform's own control: iOS has no radio button, so there a single choice is a checkmark list, the inline picker of a grouped form. Each option's label leads and the chosen option carries a trailing check, and a RadioGroup's options form one inset-grouped section with a hairline between two rows. The web and Android keep the ring and dot, and the role is `radio` on every platform. On iOS the list stays vertical when the group asks for a `row` (a list has no row form), and `card` options stay tiles that mark the choice with the same trailing check.

Pass `ref` to access the interactive radio row, preserving group navigation. Use `useRef<ComponentRef<typeof Radio>>(null)` from React, or `useRef<View>(null)` with React Native's `View` type. Object and callback refs are supported and detach on unmount. Calling `ref.current?.focus()` or `.blur()` delegates to the host without activating the control. Browser focus is supported; native focus depends on the platform and React Native version, and is separate from accessibility focus.

On the web, Space activates the focused control on key release, and Enter also activates it. Holding Space does not repeat the change. Moving focus away, disabling the control, or composing text cancels a pending Space press. RadioGroup arrow keys continue to move focus and selection.

## Usage

```tsx
<RadioGroup defaultValue="pro">
  <Radio value="hobby">Hobby</Radio>
  <Radio value="pro">Pro</Radio>
  <Radio value="enterprise">Enterprise</Radio>
</RadioGroup>
```

## Variants

### Inline

`row` lays the options out in a wrapping row. The group fills its parent's width (the parent provides the bounds, as for any list or field), so the row wraps onto another line when the options run out of room instead of running past its container.

```tsx
<RadioGroup row defaultValue="hobby">
  <Radio value="hobby">Hobby</Radio>
  <Radio value="pro">Pro</Radio>
  <Radio value="enterprise">Enterprise</Radio>
</RadioGroup>
```

### Card

```tsx
<RadioGroup row defaultValue="pro">
  <Radio card value="hobby" description="For personal projects.">Hobby</Radio>
  <Radio card value="pro" description="For growing teams.">Pro</Radio>
  <Radio card value="enterprise" description="Advanced security and support.">Enterprise</Radio>
</RadioGroup>
```

### With description

```tsx
<RadioGroup defaultValue="pro">
  <Radio value="hobby" description="For personal projects and experiments.">Hobby</Radio>
  <Radio value="pro" description="For growing teams that need more control.">Pro</Radio>
  <Radio value="enterprise" description="Advanced security, compliance, and support.">Enterprise</Radio>
</RadioGroup>
```

## Do & Don't

**Do**: Pre-select a sensible default so the common path needs no clicks, and name the set with the group's own `label`.

```tsx
<RadioGroup label="Plan" defaultValue="pro">
  <Radio value="hobby">Hobby</Radio>
  <Radio value="pro">Pro</Radio>
  <Radio value="enterprise">Enterprise</Radio>
</RadioGroup>
```

**Don't**: Leaving a radio group with nothing selected forces an extra decision and can submit empty.

```tsx
<View style={{ flexDirection: "column", gap: 8 }}>
  <Text style={{ marginBottom: 4, fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground }}>Plan</Text>
  <Radio>Hobby</Radio>
  <Radio>Pro</Radio>
  <Radio>Enterprise</Radio>
</View>
```

### Stacked

**Do**: Pass a `description` and the control stacks the title over its secondary line for you, the mark aligned to the title (the ring to its first line on the web and Android, the check centered on the row on iOS).

```tsx
<Radio checked description="For growing teams that need more control.">Pro</Radio>
```

**Don't**: Center-aligning the control floats it to the vertical middle of a two-line label, leaving it visually unattached to the title it controls.

```tsx
<View style={{ flexDirection: "column", gap: 10 }}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Radio checked />
    <View>
      <Text style={{ fontSize: 13, fontWeight: "500", color: tokens.foreground }}>Pro</Text>
      <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>For growing teams that need more control.</Text>
    </View>
  </View>
</View>
```

### Inline

**Do**: Keep generous spacing between options and tighter spacing inside each so every label clearly pairs with its own control.

```tsx
<RadioGroup row defaultValue="hobby">
  <Radio value="hobby" small>Hobby</Radio>
  <Radio value="pro" small>Pro</Radio>
  <Radio value="enterprise" small>Enterprise</Radio>
</RadioGroup>
```

**Don't**: Cramped spacing between options makes each label blur into the next radio, so it is hard to tell which dot belongs to which choice.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
  <Radio checked small>Hobby</Radio>
  <Radio small>Pro</Radio>
  <Radio small>Enterprise</Radio>
</View>
```

### Card

**Do**: Give the selected card a primary border and tinted fill so the whole tile reads as chosen, not just the dot. Pass `card` and the control derives that treatment from its checked state automatically.

```tsx
<RadioGroup row defaultValue="pro">
  <Radio card value="pro" description="For growing teams.">Pro</Radio>
  <Radio card value="enterprise" description="Advanced security.">Enterprise</Radio>
</RadioGroup>
```

**Don't**: When the selected card keeps the same plain border, only the tiny native dot signals the choice and the active card is easy to miss.

```tsx
<View style={{ flexDirection: "row", gap: 8 }}>
  <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", flexDirection: "column", borderRadius: 6, borderWidth: 1, borderColor: tokens.border, padding: 14 }}>
    <Radio checked style={{ marginBottom: 8 }} />
    <Text style={{ fontSize: 13, fontWeight: "600", color: tokens.foreground }}>Pro</Text>
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>For growing teams.</Text>
  </View>
  <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%", flexDirection: "column", borderRadius: 6, borderWidth: 1, borderColor: tokens.border, padding: 14 }}>
    <Radio style={{ marginBottom: 8 }} />
    <Text style={{ fontSize: 13, fontWeight: "600", color: tokens.foreground }}>Enterprise</Text>
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Advanced security.</Text>
  </View>
</View>
```
