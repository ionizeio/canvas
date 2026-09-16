# TextInput

Single-line (or multiline) text entry. Control it with `value` + `onChangeText`, and style the box with the usual View style props. Common props: `placeholder`, `secureTextEntry` (passwords), `keyboardType`, and `multiline`.

## Usage

```tsx
<TextInput defaultValue="Ada Lovelace" />
```

## Variants

### Placeholder

```tsx
<TextInput placeholder="Search components..." />
```

### Multiline

```tsx
<TextInput multiline defaultValue={"Multi-line text\nwraps and grows as you type."} />
```
