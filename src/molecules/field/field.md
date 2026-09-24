# Field

A form row: a label, the control, and one message line under it. Field exists for the part no
control owns on its own. Every field family already owns its label, but nothing else in the kit
renders helper or error text, so that message is what Field adds. When the row wraps a single
field-family control that has no label of its own, Field hands the label down to it rather than
drawing one alongside, so each platform still places it its own way: Dark Factory's uppercase
eyebrow above on the web, a static title above on iOS, the floating in-container label on Android.
Set `error` and it replaces `helper` in the same slot, so the row never changes height and nothing
below it jumps. On the web the label and the message sit 6px from the control, the message in Dark
Factory's small type, muted or in the error text, and a row around a control that keeps its own
label (a Switch) carries the same eyebrow.

## Usage

```tsx
<Field label="Email" helper="We'll never share your email.">
  <Input placeholder="you@example.com" />
</Field>
```

## Variants

### Error

```tsx
<Field label="Email" error="Enter a valid email address.">
  <Input defaultValue="rachel.chen" />
</Field>
```

### Email address

```tsx
<Field label="Email address" error="Invalid email format.">
  <Input leadingIcon icon="mail" defaultValue="exampledomain.com" keyboardType="email-address" autoCapitalize="none" />
</Field>
```

### Password

```tsx
<Field label="Password" error="Password must be at least 8 characters.">
  <Input leadingIcon icon="lock" secureTextEntry passwordToggle defaultValue="12345" />
</Field>
```

### Username

```tsx
<Field label="Username" error="Username already taken.">
  <Input leadingIcon icon="user" defaultValue="danello" autoCapitalize="none" />
</Field>
```

### Phone number

```tsx
<Field label="Phone number" error="Invalid phone number.">
  <PhoneInput defaultCountry="US" defaultValue="(415) 72" />
</Field>
```

### Date of birth

```tsx
<Field label="Date of birth" error="You must be at least 18 years old.">
  <Input leadingIcon icon="calendar" defaultValue="10/30/2020" keyboardType="numbers-and-punctuation" />
</Field>
```

### Amount

```tsx
<Field label="Amount" error="Invalid amount format.">
  <Input prefix="$" defaultValue="128a" keyboardType="decimal-pad" />
</Field>
```

### Helper text

```tsx
<Column relaxed>
  <Field label="Email address" helper="We only use it to sign you in.">
    <Input leadingIcon icon="mail" placeholder="example@domain.com" keyboardType="email-address" autoCapitalize="none" />
  </Field>
  <Field label="Amount" helper="Up to two decimals.">
    <Input prefix="$" placeholder="0.00" keyboardType="decimal-pad" />
  </Field>
</Column>
```

### Wrapping a control that keeps its own label

```tsx
<Field label="Notifications">
  <Switch>Release activity</Switch>
</Field>
```

### In a form

```tsx
<Form>
  <Field label="Full name">
    <Input placeholder="Rachel Chen" />
  </Field>
  <Field label="Role">
    <Select options={["Admin", "Editor", "Viewer"]} placeholder="Pick a role" />
  </Field>
  <Field label="Notes">
    <Textarea rows={3} placeholder="Anything worth remembering" />
  </Field>
</Form>
```

### Measure

```tsx
<Column>
  <Field xs start label="ZIP code" helper="xs step, pinned to the start (320)">
    <Input placeholder="94103" />
  </Field>
  <Field lg start label="Street" helper="lg step, pinned to the start (512)">
    <Input placeholder="1 Market St" />
  </Field>
  <Container lg start>
    <Field label="City" helper="Bare, in an lg Container: fills it (512)">
      <Input placeholder="San Francisco" />
    </Field>
  </Container>
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
  <Text style={{ fontSize: 10, lineHeight: 13, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: tokens["muted-foreground"] }}>Email</Text>
  <Input placeholder="you@example.com" />
</Column>
```
