# Textarea

Multi-line input, with character count, with toolbar. Pass `label` (and `required`) to name the field: iOS and web render the label above the control, while Android floats the Material 3 in-container label at the top of the multiline box. The box fills the parent it is given; a Container step or a Row span sets its measure.

Android uses the same opaque muted surface as the other filled fields. Its label
uses `primary-text` when focused and `destructive-text` on error. The over-limit
character count also uses `destructive-text` on every platform.

Inside an overlay, Escape follows the overlay's cancellation policy. A supplied
`onKeyPress` runs first and can call `preventDefault()` to handle Escape locally.
Cancelling an IME candidate keeps the overlay open.

## Usage

```tsx
<Textarea rows={4} placeholder="A few words about this project" />
```

## Variants

### With label

```tsx
<Textarea label="Description" rows={4} placeholder="A few words about this project…" />
```

### Pre-filled

```tsx
<Textarea label="Description" rows={4} defaultValue="Canvas renders the same components natively on iOS and Android and on the web." />
```

### Required

```tsx
<Textarea label="Bio" required rows={4} placeholder="Tell us about yourself…" />
```

### Character counter

```tsx
<Textarea label="Description" showCount maxLength={280} rows={4} placeholder="A few words about this project…" />
```

### Formatting toolbar

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <Row alignCenter tight padTight>
    <Button ghost small>B</Button>
    <Button ghost small>I</Button>
    <Button ghost small>{"</>"}</Button>
    <Divider vertical style={{ height: 16 }} />
    <Button ghost small>Comment</Button>
  </Row>
  <Divider />
  <Textarea rows={4} flush placeholder="Leave a comment…" />
</Card>
```

### Disabled

```tsx
<Textarea rows={4} disabled placeholder="A few words about this project" />
```

### Widths come from the parent

```tsx
<Column snug>
  <Container xs start><Textarea rows={2} placeholder="In an xs Container (320)" /></Container>
  <Container lg start><Textarea rows={2} placeholder="In an lg Container (512)" /></Container>
  <Textarea rows={2} placeholder="Bare: fills the parent" />
</Column>
```

## Do & Don't

### With label

**Do** — Set `rows` for a sensible starting height so users can see their text; the field grows with the content from there.

```tsx
<Textarea label="Description" rows={3} value="This is a longer description that runs past one line and stays readable." />
```

**Don't** — A locked, single-line textarea hides long content with no way to expand.

```tsx
<View style={{ maxWidth: 400, flexDirection: "column", gap: 6 }}>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Description</Text>
  <TextInput numberOfLines={1} value="This is a longer description that runs past one line and gets clipped." style={{ height: 32, width: "100%", borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background, paddingHorizontal: 12, paddingVertical: 4, fontSize: 14, lineHeight: 20, color: tokens.foreground }} />
</View>
```

### Character counter

**Do** — Show the live count against the cap and turn it destructive past the limit so the overage is precise. `showCount` treats `maxLength` as a soft cap and flips the count (and the field) destructive automatically once you run over.

```tsx
<Textarea label="Bio" showCount maxLength={120} rows={3} value="I have been building things on the web for fifteen years and counting, across teams large and small, shipping product end to end." />
```

**Don't** — A vague "over limit" message gives no number, so users cannot tell how much to trim.

```tsx
<View style={{ maxWidth: 400, flexDirection: "column", gap: 6 }}>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Bio</Text>
  <Textarea rows={3} value="I have been building things on the web for fifteen years and counting, across teams large and small, shipping product end to end." />
  <View style={{ marginTop: 4, flexDirection: "row", justifyContent: "flex-end" }}>
    <Text style={{ fontSize: 11, color: tokens["muted-foreground"] }}>over limit</Text>
  </View>
</View>
```

### Formatting toolbar

**Do** — Make each control a real focusable button that toggles an active state when pressed.

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <Row alignCenter tight padTight>
    <Button ghost small>B</Button>
    <Button ghost small>I</Button>
    <Button ghost small>{"</>"}</Button>
  </Row>
  <Divider />
  <Textarea rows={4} flush placeholder="Leave a comment" />
</Card>
```

**Don't** — Static, unclickable glyphs look like a toolbar but cannot be pressed or focused.

```tsx
<View style={{ width: 400, maxWidth: "100%", overflow: "hidden", borderRadius: 6, borderWidth: 1, borderColor: tokens.border }}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 1, borderColor: tokens.border, backgroundColor: alpha(tokens.muted, 0.3), paddingHorizontal: 12, paddingVertical: 8 }}>
    <Text style={{ paddingHorizontal: 8, fontSize: 14, lineHeight: 20, fontWeight: "700" }}>B</Text>
    <Text style={{ paddingHorizontal: 8, fontSize: 14, lineHeight: 20, fontStyle: "italic" }}>I</Text>
    <Text style={{ paddingHorizontal: 8, fontFamily: "monospace", fontSize: 11 }}>{"</>"}</Text>
  </View>
  <Textarea rows={4} placeholder="Leave a comment" style={{ borderRadius: 0, borderWidth: 0, ...shadow("none") }} />
</View>
```

### Disabled

**Do** — Use the disabled attribute so the field blocks editing and focus, matching its dimmed look.

```tsx
<Textarea label="Description" rows={3} disabled value="Read-only content the user must not change." />
```

**Don't** — Dimming a textarea while leaving it editable looks disabled but still accepts input.

```tsx
<View style={{ maxWidth: 400, flexDirection: "column", gap: 6 }}>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Description</Text>
  <TextInput multiline editable textAlignVertical="top" value="Read-only content the user must not change." style={{ minHeight: 80, width: "100%", borderRadius: 6, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, lineHeight: 20, color: tokens.foreground, opacity: 0.5 }} />
</View>
```
