# Checkbox

Multi-select option, single yes/no, grouped lists.

Pass `ref` to access the interactive checkbox row, including its label. Use `useRef<ComponentRef<typeof Checkbox>>(null)` from React, or `useRef<View>(null)` with React Native's `View` type. Object and callback refs are supported and detach on unmount. Calling `ref.current?.focus()` or `.blur()` delegates to the host without activating the control. Browser focus is supported; native focus depends on the platform and React Native version, and is separate from accessibility focus.

On the web, Space activates the focused control on key release, and Enter also activates it. Holding Space does not repeat the change. Moving focus away, disabling the control, or composing text cancels a pending Space press.

## Usage

```tsx
<Checkbox defaultChecked>Email notifications</Checkbox>
```

## Variants

### Unchecked

```tsx
<Checkbox>Email notifications</Checkbox>
```

### Disabled

```tsx
<Checkbox disabled>Email notifications</Checkbox>
```

### Sizes

```tsx
<Column>
  <Checkbox small defaultChecked>Small</Checkbox>
  <Checkbox defaultChecked>Default</Checkbox>
  <Checkbox large defaultChecked>Large</Checkbox>
</Column>
```

### With description

```tsx
<Checkbox defaultChecked description="Get notified when activity happens on your account.">
  Email notifications
</Checkbox>
```

### Nested group

A parent "select all" over a group of children. Wire the parent's `checked` and
`indeterminate` from the children's state: `checked` when every child is on,
`indeterminate` when only some are, and toggling the parent selects or clears the
whole group. (`Stateful` is a docs-only state holder so this fence can show the
controlled wiring; in an app that state lives in your own component.)

```tsx
<Stateful initial={["Read"]}>
  {(selected, setSelected) => {
    const perms = ["Read", "Write", "Delete"];
    const all = perms.every((p) => selected.includes(p));
    const some = selected.length > 0 && !all;
    return (
      <Column>
        <Checkbox
          checked={all}
          indeterminate={some}
          onChange={(next) => setSelected(next ? perms : [])}
        >
          Select all
        </Checkbox>
        <Column indent>
          {perms.map((p) => (
            <Checkbox
              key={p}
              checked={selected.includes(p)}
              onChange={(next) =>
                setSelected(next ? [...selected, p] : selected.filter((x) => x !== p))
              }
            >
              {p}
            </Checkbox>
          ))}
        </Column>
      </Column>
    );
  }}
</Stateful>
```

## Do & Don't

### Unchecked

**Do** — Leave opt-in consent unchecked so agreeing is a deliberate act the user takes.

```tsx
<Checkbox>Email me product news, offers, and survey invitations.</Checkbox>
```

**Don't** — A consent box that starts checked opts users in by default; under GDPR pre-ticked consent is not consent.

```tsx
<Checkbox defaultChecked>Email me product news, offers, and survey invitations.</Checkbox>
```

### Checked

**Do** — Show the parent indeterminate (a dash, not a tick) when only some children are checked.

```tsx
<Column snug>
  <Checkbox indeterminate>Select all</Checkbox>
  <Column snug indent>
    <Checkbox defaultChecked>Read</Checkbox>
    <Checkbox>Write</Checkbox>
    <Checkbox>Delete</Checkbox>
  </Column>
</Column>
```

**Don't** — A fully checked parent claims every child is selected when only one is, so the state reads as a lie.

```tsx
<View style={{ gap: 8 }}>
  <Checkbox defaultChecked>Select all</Checkbox>
  <View style={{ marginLeft: 24, gap: 8 }}>
    <Checkbox defaultChecked>Read</Checkbox>
    <Checkbox>Write</Checkbox>
    <Checkbox>Delete</Checkbox>
  </View>
</View>
```

### Disabled

**Do** — Say why it's unavailable, like a plan gate, or don't show it at all.

```tsx
<Checkbox disabled description="Available on the Pro plan">Export to CSV</Checkbox>
```

**Don't** — A disabled option with no reason leaves users stuck and guessing.

```tsx
<Checkbox disabled>Export to CSV</Checkbox>
```

### Selection

**Do** — Radios for one-of-many; reserve checkboxes for independent multi-select.

```tsx
<Column snug>
  <Typography small semibold>Plan</Typography>
  <RadioGroup defaultValue="pro">
    <Radio value="free">Free</Radio>
    <Radio value="pro">Pro</Radio>
    <Radio value="enterprise">Enterprise</Radio>
  </RadioGroup>
</Column>
```

**Don't** — Checkboxes allow multiple selections; for a one-of choice they let users pick contradictory options.

```tsx
<View style={{ gap: 8 }}>
  <Text style={{ marginBottom: 4, fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground }}>Plan</Text>
  <Checkbox>Free</Checkbox>
  <Checkbox defaultChecked>Pro</Checkbox>
  <Checkbox>Enterprise</Checkbox>
</View>
```

### With description

**Do** — Pass a `description` and the control stacks the title over its secondary line for you, box aligned to the first text line and the whole row tappable.

```tsx
<Checkbox defaultChecked description="Get notified when activity happens on your account.">
  Email notifications
</Checkbox>
```

**Don't** — A detached checkbox makes only the 16px box tappable; the label text does nothing.

```tsx
<View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
  <View style={{ marginTop: 2 }}>
    <Checkbox defaultChecked />
  </View>
  <View>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Email notifications</Text>
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Get notified when activity happens on your account.</Text>
  </View>
</View>
```
