# Popover

Floating panel with a title, supporting text, rich content such as form fields, and a single follow-up action, anchored to its trigger. Pass children to host custom content in the panel body, between the description and the action.

In glass mode the triggered card hands off with its button, the way the iOS 26
menu takes its button: the button's pill and label vanish whole as a droplet forms
hanging under the pill, the card blooms up out of it over the pill's spot (or down
over it when it fits above) with a bounded contour overshoot, recoils and settles
resting over the pill's box, and on close its content
goes out of reach at once while the pane narrows back to the pill, re-forms it
and the label fades back. Focus enters only once the material covers the panel,
and the `inline` card is a static in-flow panel that never animates. Reduce
Motion settles at once with the button untouched; solid mode keeps the ordinary
entrance.

## Usage

```tsx
<Popover
  trigger="Open popover"
  title="Rename project"
  description="Choose a name your team will recognize."
  actionLabel="Rename"
>
  <Input label="Project name" defaultValue="Identity Platform" />
</Popover>
```

## Do & Don't

**Do** — Keep popovers compact: a focused prompt with one input and a clear action.

```tsx
<Popover inline title="Rename this project?" actionLabel="Rename">
  <Input label="Project name" defaultValue="Identity Platform" />
</Popover>
```

**Don't** — A full form belongs in a dialog; in a floating popover it is cramped and easy to dismiss by accident.

```tsx
<View style={{ borderRadius: 6, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.popover, padding: 16, ...shadow("md"), alignSelf: "flex-start", minWidth: 260 }}>
  <Input label="Name" placeholder="Ada Lovelace" style={{ marginBottom: 8 }} />
  <Input label="Email" placeholder="ada@canvas.dev" style={{ marginBottom: 8 }} />
  <View style={{ marginBottom: 8 }}>
    <Text style={{ marginBottom: 6, fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Role</Text>
    <Select defaultValue="Engineer" options={["Engineer", "Designer", "Manager"]} />
  </View>
  <Input label="Team" placeholder="Identity Platform" style={{ marginBottom: 8 }} />
  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
    <Button outline small>Cancel</Button>
    <Button primary small>Save</Button>
  </View>
</View>
```

### Triggered

**Do** — Wrap the trigger in a relative anchor and dismiss on outside click so the panel positions and closes predictably.

```tsx
<Popover trigger="Open popover" open description="Anchored to the trigger, closes on outside click." actionLabel="Close" />
```

**Don't** — A trigger with no relative anchor and no way to dismiss leaves the panel floating loose and stuck open.

```tsx
<View style={{ alignSelf: "flex-start" }}>
  <Button outline small>Open popover</Button>
  <View style={{ borderRadius: 6, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.popover, padding: 16, ...shadow("md"), marginTop: 8, minWidth: 240 }}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["popover-foreground"] }}>No anchor, no dismiss, no Close.</Text>
  </View>
</View>
```

### Inline

**Do** — Reserve the static panel for a brief always-on message with a single follow-up action.

```tsx
<Popover inline description="Saved to drafts. Publish when ready." actionLabel="Publish" />
```

**Don't** — An always-visible panel that scrolls internally is doing a card's or section's job; use the panel chrome only for short content.

```tsx
<View style={{ borderRadius: 6, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.popover, padding: 16, ...shadow("md"), maxHeight: 120, minWidth: 260, overflow: "hidden" }}>
  <ScrollView style={{ maxHeight: 88 }}>
    <Input label="Street" placeholder="100 Market St" style={{ marginBottom: 8 }} />
    <Input label="City" placeholder="San Francisco" style={{ marginBottom: 8 }} />
    <Input label="Region" placeholder="California" style={{ marginBottom: 8 }} />
    <Input label="Postal code" placeholder="94105" style={{ marginBottom: 8 }} />
  </ScrollView>
</View>
```
