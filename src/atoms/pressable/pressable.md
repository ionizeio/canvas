# Pressable

The touchable primitive: wraps content and fires onPress. Its style prop accepts a function of the press state, `({ pressed }) => style`, so you can show press feedback with no extra wrapper.

## Usage

Wire `onPress` to your own handler. The background dims while the button is held, straight from the `({ pressed }) => style` function.

```tsx
<Pressable style={({ pressed }) => ({ padding: 12, borderRadius: 8, backgroundColor: pressed ? alpha(tokens.primary, 0.8) : tokens.primary })}>
  <Text style={{ color: tokens["primary-foreground"] }}>Press and hold</Text>
</Pressable>
```

## Variants

### Opacity

The style function dims the whole surface to 50% opacity while pressed.

```tsx
<Pressable style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
  <Text style={{ color: tokens.foreground }}>Press and hold</Text>
</Pressable>
```

### Disabled

A disabled Pressable ignores presses.

```tsx
<Pressable disabled style={{ padding: 12, borderRadius: 8, backgroundColor: tokens.muted, opacity: 0.5 }}>
  <Text style={{ color: tokens.foreground }}>Disabled</Text>
</Pressable>
```
