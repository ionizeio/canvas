# Input

The Input component is a React Native text field with semantic boolean props (`error`, `small`, `large`, `disabled`), plus prefix/suffix addons and overlaid icons. Input is single-line; for multi-line entry use the dedicated Textarea. Pass `label` (and `required`) to name the field: iOS and web render the label above the control, while Android floats the Material 3 in-container label. Select and the search field share its look, and Field and Form compose that label with helper and error text.

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

### Error

```tsx
<Input error placeholder="rachel.chen@example.com" />
```

### Disabled

```tsx
<Input disabled placeholder="rachel.chen@example.com" />
```

### Read only

```tsx
<Input readOnly defaultValue="rachel.chen@example.com" />
```

### Widths come from the parent

```tsx
<Column snug>
  <Container xs start><Input placeholder="In an xs Container (320)" /></Container>
  <Input placeholder="Bare: fills the parent" />
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
