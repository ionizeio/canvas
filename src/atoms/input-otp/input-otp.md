# InputOTP

A segmented one-time-code field: `length` cells display the typed characters while one underlying text input captures the keystrokes, so native SMS autofill, the one-time-code keyboard suggestion, and paste all flow into a single value. Because that one input spans the whole row, the caret is pinned to the end of the code: tap any cell and the next character still lands in the first unfilled one. The platform's own Paste is there too: a long press opens it on Android and, except at the very start of the row, on an iPhone, and the context menu or the paste shortcut does on the web. A paste, an autofill or a keyboard's clipboard suggestion that carries a whole code becomes the code, however much of one the field already holds, so a code copied from a message lands whole in a half-typed or a full field; anything shorter lands where typing would, in the first unfilled cell, and whatever runs past the last cell is dropped (in a one-cell field every character is a whole code, so typing replaces it). Spaces, dashes and other separators never take a cell: "482 913" and "482-913" both fill 482913. On Android and the web a selected code (Select All, a long press at the start of the row on Android, a double click on the web) is replaced by whatever is typed or pasted. It works controlled (`value` + `onChangeText`) or uncontrolled (`defaultValue`, or a bare `<InputOTP />` that is typeable out of the box); `onComplete` fires once the code reaches `length` characters. Style and shape it with semantic props: `groups` splits the run into dash-separated chunks, `alphanumeric` accepts ASCII letters as well as digits, and `small`, `large`, `masked`, `disabled` and `autoFocus` do what they say.

Neither iOS nor Material 3 ships a one-time-code control, so every platform draws the same
field: each cell is Dark Factory's field, a translucent square well as tall as an Input of
the same size, at a 10px corner and set a few pixels apart from the next, whose hairline
turns violet on the cell the next character lands in. The digits are semibold, and the
caret is a violet bar that blinks once a second (Reduce Motion holds it still). On an
iPhone and on Android a cell grows taller where it is shorter than the platform's touch
minimum. A disabled field keeps a hairline frame on each cell, with no fill
and muted digits, rather than fading.

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
