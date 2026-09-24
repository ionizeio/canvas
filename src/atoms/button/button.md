# Button

Six intents × three sizes (plus the icon square) × disabled / focus / hover states. Always semantic: the intent communicates what the button does (default = the primary action, destructive = irreversible, ghost = chrome). On the web every intent is a pill: the call to action is the green `action` pill, `secondary` a violet outline, `outline` a hairline, `ghost` and `link` bare. A primary button rises 1 px under the pointer over 150 ms and settles back when it leaves, the outline looks take a hover wash at once, and a link dims; a disabled or loading button stays put, and Reduce Motion makes the lift instant. A disabled web button goes transparent with a hairline and a muted label rather than fading. On iOS and Android the buttons keep their platform shapes in the theme's colours.

Pass `ref` to access the interactive Pressable, including link buttons. Use `useRef<ComponentRef<typeof Button>>(null)` from React, or `useRef<View>(null)` with React Native's `View` type. Object and callback refs are supported and detach on unmount. Calling `ref.current?.focus()` or `.blur()` delegates to the host without activating the control. Browser focus is supported; native focus depends on the platform and React Native version, and is separate from accessibility focus.

## Usage

A button's whole job is to fire `onPress`. Wire it to your own handler and every press runs it.

```tsx
<Button>Save changes</Button>
```

## Variants

The variant only changes how a button looks; every one of them fires `onPress` the same way.

### Outline

```tsx
<Button outline>Save changes</Button>
```

### Secondary

```tsx
<Button secondary>Save changes</Button>
```

### Ghost

```tsx
<Button ghost>Save changes</Button>
```

### Destructive

```tsx
<Button destructive>Save changes</Button>
```

### Link

```tsx
<Button link>Save changes</Button>
```

### Small

```tsx
<Button small>Save changes</Button>
```

### Large

```tsx
<Button large>Save changes</Button>
```

### Icon only

```tsx
<Button icon accessibilityLabel="Add item" iconLeft={<Icon plus primaryForeground size={16} />} />
```

### Disabled

A disabled button ignores presses: `onPress` never runs.

```tsx
<Button disabled>Save changes</Button>
```

### Loading

```tsx
<Button loading>Saving</Button>
```

### Raised

`raised` rests the page's main call to action on a soft glow in its own colour. Only a primary button takes it, and never while disabled.

```tsx
<Button raised>Mint agent</Button>
```

### Block

```tsx
<Button block>Create account</Button>
```

### Measure

```tsx
<Container>
  <Column>
    <Button xs start>xs step, pinned to the start (320)</Button>
    <Button md>md step, centered (448)</Button>
    <Button block>Block: fills the parent</Button>
  </Column>
</Container>
```

### With icon

```tsx
<Button iconLeft={<Icon plus primaryForeground size={16} />}>Save changes</Button>
```

## Do & Don't

### Default (primary)

**Do** — One clear primary action; everything else is supporting.

```tsx
<Row alignCenter snug>
  <Button primary>Save</Button>
  <Button outline>Cancel</Button>
</Row>
```

**Don't** — Multiple primaries compete; nothing stands out.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
  <Button primary>Save</Button>
  <Button primary>Apply</Button>
  <Button primary>Continue</Button>
</View>
```

### Outline

**Do** — Promote the main action to default; keep the rest outline.

```tsx
<Row alignCenter snug>
  <Button primary>Publish</Button>
  <Button outline>Save draft</Button>
  <Button outline>Schedule</Button>
</Row>
```

**Don't** — All-outline leaves no signal which action is primary.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
  <Button outline>Save</Button>
  <Button outline>Publish</Button>
  <Button outline>Schedule</Button>
</View>
```

### Secondary

**Do** — Default for the primary action; secondary for the next one down.

```tsx
<Row alignCenter snug>
  <Button primary>Create account</Button>
  <Button secondary>Import instead</Button>
</Row>
```

**Don't** — A secondary button as the main call to action under-sells it.

```tsx
<Button secondary>Create account</Button>
```

### Ghost

**Do** — Use ghost for tertiary and toolbar actions; keep the CTA filled.

```tsx
<Row alignCenter snug>
  <Button ghost>Cancel</Button>
  <Button primary>Save changes</Button>
</Row>
```

**Don't** — A ghost button is too quiet to carry the primary action.

```tsx
<Button ghost>Save changes</Button>
```

### Destructive

**Do** — Reserve the destructive variant for irreversible actions like delete.

```tsx
<Row alignCenter snug>
  <Button primary>Save changes</Button>
  <Button destructive>Delete account</Button>
</Row>
```

**Don't** — Red on a safe action cries wolf; users learn to ignore it.

```tsx
<Button destructive>Save changes</Button>
```

### Link

**Do** — Link variant for inline navigation; a filled button for the submit.

```tsx
<Row alignCenter cozy>
  <Button primary>Submit</Button>
  <Button link>Learn more</Button>
</Row>
```

**Don't** — A link-styled submit doesn't look pressable and gets lost.

```tsx
<Button link>Submit form</Button>
```

## Real links (href)

A button that NAVIGATES should be a real link, not a press handler that sets `location`. Pass `href` and the web render becomes a genuine browser link: middle-click, cmd-click, and open-in-new-tab all work, crawlers see the destination, and assistive tech hears a link. Native platforms have no anchors, so pair `href` with an `onPress` that runs the same navigation through your router; while `disabled` or `loading` the anchor is suppressed exactly like `onPress`. `hrefAttrs` carries the anchor attributes react-native-web forwards (`target`, `rel`, `download`).

```tsx
<Row alignCenter cozy>
  <Button link href="https://canvas.nannier.com">Read the docs</Button>
  <Button outline href="https://www.npmjs.com/package/@ionizeio/canvas" hrefAttrs={{ target: "_blank", rel: "noreferrer" }}>
    npm package
  </Button>
</Row>
```
