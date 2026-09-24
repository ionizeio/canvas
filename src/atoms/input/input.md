# Input

The Input component is a React Native text field with semantic boolean props (`error`, `small`, `large`, `disabled`), plus prefix/suffix addons, overlaid icons (`leadingIcon` / `trailingIcon` with any Canvas glyph as `icon`), a `passwordToggle` eye for a `secureTextEntry` value, and a `clearable` clear button. Input is single-line; for multi-line entry use the dedicated Textarea. Pass `label` (and `required`) to name the field: iOS and web render the label above the control, while Android floats the Material 3 in-container label. Field and Form compose that label with helper and error text.

On the web the field is Dark Factory's: a translucent well at a 10px corner with a hairline that turns violet on focus and red on an error, a 13px semibold value, and an uppercase eyebrow label in the muted ink above it. Addons sit in a muted box, glyphs are 15px, and a disabled field keeps a hairline frame with no fill and a muted value rather than fading. On iOS the field is drawn to the iOS input-field reference: a white box with a hairline, a muted title above, a glyph that tints with focus and error, and an error wash. Android keeps the Material 3 filled field.

Inside an overlay, Escape follows the overlay's cancellation policy. A supplied
`onKeyPress` runs first and can call `preventDefault()` to handle Escape locally.
Cancelling an IME candidate keeps the overlay open.

## Usage

```tsx
<Input placeholder="rachel.chen@example.com" />
```

## Variants

### Label

```tsx
<Input label="Email" placeholder="rachel.chen@example.com" />
```

### Required

```tsx
<Input label="Full name" required placeholder="Rachel Chen" />
```

### Prefix

```tsx
<Input prefix="https://" placeholder="canvas.dev" />
```

### Action

```tsx
<Input suffix="Copy" action defaultValue="cnv_3f9a21b8e7" />
```

### Icon

```tsx
<Input leadingIcon icon="search" placeholder="Search" />
```

### Email

```tsx
<Input label="Email address" leadingIcon icon="mail" placeholder="example@domain.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
```

### Password

```tsx
<Input label="Password" leadingIcon icon="lock" secureTextEntry passwordToggle placeholder="••••••••" autoComplete="password" />
```

### Username

```tsx
<Input label="Username" leadingIcon icon="user" placeholder="yourname" defaultValue="danello87" autoCapitalize="none" autoComplete="username" />
```

### Date of birth

```tsx
<Input label="Date of birth" leadingIcon icon="calendar" placeholder="MM/DD/YYYY" keyboardType="numbers-and-punctuation" autoComplete="birthdate-full" />
```

### Currency

```tsx
<Input label="Amount" prefix="$" placeholder="0.00" keyboardType="decimal-pad" />
```

### Search

```tsx
<Input leadingIcon icon="search" clearable placeholder="Search" defaultValue="example" />
```

### Card number

```tsx
<Input label="Card Number" trailingIcon icon="creditCard" placeholder="•••• •••• •••• ••••" keyboardType="number-pad" autoComplete="cc-number" textContentType="creditCardNumber" />
```

### Error

```tsx
<Input error placeholder="rachel.chen@example.com" />
```

### Disabled

```tsx
<Input disabled defaultValue="rachel.chen@example.com" />
```

### Read only

```tsx
<Input readOnly defaultValue="rachel.chen@example.com" />
```

### Measure

```tsx
<Column snug>
  <Input xs start placeholder="xs step, pinned to the start (320)" />
  <Input lg start placeholder="lg step, pinned to the start (512)" />
  <Container lg start><Input placeholder="Bare, in an lg Container: fills it (512)" /></Container>
</Column>
```

## Do & Don't

### text

**Do** — Pass `label` so every field carries a persistent, programmatically-linked name.

```tsx
<Input label="Email" placeholder="ada@acme.dev" />
```

**Don't** — A placeholder is not a label; it vanishes the moment the user types and screen readers may skip it.

```tsx
<Input placeholder="Email" />
```

### number

**Do** — Park the unit in a suffix addon so the value stays purely numeric.

```tsx
<Input label="Storage" defaultValue="1024" suffix="GB" />
```

**Don't** — A plain text field lets users type the unit into the value, breaking parsing and validation.

```tsx
<Input label="Storage" defaultValue="1024 GB" />
```
