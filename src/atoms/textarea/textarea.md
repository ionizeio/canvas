# Textarea

Multi-line input, with character count, with toolbar. Pass `label` (and `required`) to name the field: iOS and web render the label above the control, while Android floats the Material 3 in-container label at the top of the multiline box. The box fills the parent it is given; a step of its own (`xs`, `lg`, …, with `start` to pin it to the leading edge) or a Container step sets its measure.

On the web the box is Dark Factory's field, the Input's: a translucent well at a 10px
corner with a hairline that turns violet on focus and red on an error, a 13px semibold
value, the uppercase eyebrow label in the muted ink, and the count in Dark Factory's small
type. A disabled field keeps a hairline frame with no fill and a muted value rather than
fading. iOS draws the Input's white reference box. Android uses the same opaque muted
surface as the other filled fields, with the same violet active indicator; its label uses
`primary-text` when focused and `destructive-text` on error. The over-limit character count
uses `destructive-text` on every platform.

Inside an overlay, Escape follows the overlay's cancellation policy. A supplied
`onKeyPress` runs first and can call `preventDefault()` to handle Escape locally.
Cancelling an IME candidate keeps the overlay open.

## Usage

```tsx
<Textarea placeholder="A few words about this project" />
```

## Variants

### With label

```tsx
<Textarea label="Description" placeholder="A few words about this project…" />
```

### Pre-filled

```tsx
<Textarea defaultValue="Renders natively on iOS and Android and on the web." />
```

### Required

```tsx
<Textarea label="Bio" required />
```

### Character counter

```tsx
<Textarea showCount maxLength={280} />
```

### Formatting toolbar

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <Row tight padTight>
    <Button ghost small>B</Button>
    <Button ghost small>I</Button>
  </Row>
  <Divider />
  <Textarea flush placeholder="Leave a comment…" />
</Card>
```

### Disabled

```tsx
<Textarea disabled placeholder="A few words about this project" />
```

### Measure

```tsx
<Column>
  <Textarea xs start rows={2} placeholder="xs step, pinned to the start (320)" />
  <Textarea lg start rows={2} placeholder="lg step, pinned to the start (512)" />
  <Container lg start><Textarea rows={2} placeholder="Bare, in an lg Container: fills it (512)" /></Container>
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
  <Text style={{ fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: tokens["muted-foreground"] }}>Description</Text>
  <TextInput numberOfLines={1} value="This is a longer description that runs past one line and gets clipped." style={{ height: 40, width: "100%", borderRadius: 10, borderWidth: 1, borderColor: tokens["field-border"], backgroundColor: tokens["field-fill"], paddingHorizontal: 12, paddingVertical: 0, fontSize: 13, lineHeight: 18, fontWeight: "600", color: tokens.foreground }} />
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
  <Text style={{ fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: tokens["muted-foreground"] }}>Bio</Text>
  <Textarea rows={3} value="I have been building things on the web for fifteen years and counting, across teams large and small, shipping product end to end." />
  <View style={{ marginTop: 4, flexDirection: "row", justifyContent: "flex-end" }}>
    <Text style={{ fontSize: 11.5, lineHeight: 17, fontWeight: "600", color: tokens["muted-foreground"] }}>over limit</Text>
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

**Do**: Use the disabled prop so the field blocks editing, matching its disabled look.

```tsx
<Textarea label="Description" rows={3} disabled value="Read-only content the user must not change." />
```

**Don't**: A textarea painted to look disabled but left editable still accepts input.

```tsx
<View style={{ maxWidth: 400, flexDirection: "column", gap: 6 }}>
  <Text style={{ fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: tokens["muted-foreground"] }}>Description</Text>
  <TextInput multiline editable textAlignVertical="top" value="Read-only content the user must not change." style={{ minHeight: 82, width: "100%", borderRadius: 10, borderWidth: 1, borderColor: tokens.border, backgroundColor: "transparent", paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, lineHeight: 20, fontWeight: "600", color: tokens["muted-foreground"] }} />
</View>
```
