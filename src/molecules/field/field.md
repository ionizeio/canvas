# Field

A form row: a label, the control, and one message line under it. Field exists for the part no
control owns on its own. Every field family already owns its label, but nothing else in the kit
renders helper or error text, so that message is what Field adds. When the row wraps a single
field-family control that has no label of its own, Field hands the label down to it rather than
drawing one alongside, so each platform still places it its own way: a static title above on web
and iOS, the floating in-container label on Android. Set `error` and it replaces `helper` in the
same slot, so the row never changes height and nothing below it jumps.

## Usage

```tsx
<Field label="Email" helper="We'll never share your email." required>
  <Input placeholder="you@example.com" />
</Field>
```

## Variants

### Helper text

```tsx
<Field label="Workspace URL" helper="Lowercase letters, numbers and hyphens.">
  <Input placeholder="acme-inc" />
</Field>
```

### Error

```tsx
<Field label="Email" error="Enter a valid email address." required>
  <Input value="rachel.chen" />
</Field>
```

### Wrapping a control that keeps its own label

```tsx
<Field label="Notifications" helper="You can change this at any time.">
  <Switch defaultChecked>Release activity</Switch>
</Field>
```

### In a form

```tsx
<Column snug>
  <Field label="Full name" required>
    <Input placeholder="Rachel Chen" />
  </Field>
  <Field label="Role" helper="Controls what this person can see.">
    <Select options={["Admin", "Editor", "Viewer"]} placeholder="Pick a role" />
  </Field>
  <Field label="Notes">
    <Textarea rows={3} placeholder="Anything worth remembering" />
  </Field>
</Column>
```

## Do & Don't

### The message line

**Do** — Put helper and error text on the Field, so the row owns one message slot and the type and
color stay right in both states.

```tsx
<Field label="Email" error="Enter a valid email address." required>
  <Input value="rachel.chen" />
</Field>
```

**Don't** — Stack a raw Text under the control: it drifts from the caption scale, misses the
destructive tone, and is never announced as an error.

```tsx
<Column tight>
  <Input label="Email" required value="rachel.chen" />
  <Text style={{ fontSize: 12, color: "#e7000b" }}>Enter a valid email address.</Text>
</Column>
```

### The label

**Do** — Let Field hand the label to the control it wraps, so Android can float it inside the box.

```tsx
<Field label="Email">
  <Input placeholder="you@example.com" />
</Field>
```

**Don't** — Label the control from outside with your own Text: the label can never float, and the
tap target no longer includes it.

```tsx
<Column tight>
  <Text style={{ fontSize: 14, fontWeight: "500" }}>Email</Text>
  <Input placeholder="you@example.com" />
</Column>
```
