# InputOTP

A segmented one-time-code field: `length` cells display the typed characters while one underlying text input captures the keystrokes, so native SMS autofill, the one-time-code keyboard suggestion, and paste all flow into a single value. Because that one input spans the whole row, the caret is pinned to the end of the code: tap any cell and the next character still lands in the first unfilled one, so a keystroke can never drop into the middle of a partly-entered code. It works controlled (`value` + `onChangeText`) or uncontrolled (`defaultValue`, or a bare `<InputOTP />` that is typeable out of the box); `onComplete` fires once the code reaches `length` characters. Style and shape it with semantic props: `groups` splits the run into dash-separated chunks, `alphanumeric` accepts letters as well as digits, and `small`, `large`, `masked`, `disabled` and `autoFocus` do what they say.

## Usage

```tsx
<InputOTP />
```

## Variants

### Length

```tsx
<InputOTP length={4} />
```

### Grouped

```tsx
<InputOTP groups={3} />
```

### Alphanumeric

```tsx
<InputOTP alphanumeric defaultValue="G" />
```

### Masked

```tsx
<InputOTP masked defaultValue="1234" />
```

### Sizes

```tsx
<Column relaxed>
  <InputOTP small />
  <InputOTP />
  <InputOTP large />
</Column>
```

### Disabled

```tsx
<InputOTP disabled defaultValue="1234" />
```

## Do & Don't

**Do** — Size the field to the real code length with `length`, and split a long code with `groups` so the eye can chunk it the way the sender wrote it.

```tsx
<InputOTP length={6} groups={3} />
```

**Don't** — Use `masked` for a code the user is meant to read back from an SMS; the bullets hide whether they typed it correctly.

```tsx
<InputOTP masked defaultValue="123456" />
```
