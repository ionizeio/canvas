# MediaObject

Image or icon paired with text content. The fundamental building block for list items, notifications, and comment layouts.

## Usage

```tsx
<MediaObject
  avatar="RC"
  title="Rachel Chen"
  description="Engineering Lead"
  body="Reviewed the latest pull request and left comments on the auth middleware changes."
  bordered
/>
```

## Variants

### Compact

```tsx
<MediaObject compact avatar="RC" title="Rachel Chen" description="rachel.chen@example.com" />
```

### Bare row with meta

```tsx
<MediaObject avatar="RC" title="Rachel Chen" description="Commented on the deploy pipeline." meta="1h" />
```

### Icon

```tsx
<MediaObject bordered title="Security first" description="End-to-end encryption with automatic key rotation." icon={<Icon shield primary size={18} />} />
```

### Action

The trailing `action` slot takes any control; the button's `onPress` is yours to
wire.

```tsx
<MediaObject bordered src="/ada-lovelace.jpg" title="Ada Lovelace" description="ada@example.com" action={<Button outline small>Invite</Button>} />
```

### Tappable

Passing `onPress` makes the whole row a single tap target; wire it to your own
handler and every tap runs it.

```tsx
<MediaObject onPress={() => {}} bordered avatar="RC" title="Rachel Chen" description="Engineering Lead" />
```

## Do & Don't

### Avatar

**Do** — Top-align with `start` so the avatar anchors to the first line of the title.

```tsx
<MediaObject bordered start src="/rachel-chen.jpg" title="Rachel Chen" description="Engineering Lead" body="Reviewed the latest pull request and left comments on the auth middleware changes. Need to discuss the token rotation approach before merging." />
```

**Don't** — Centering the avatar against a multi-line body leaves it floating beside the middle of the text.

```tsx
<MediaObject bordered center src="/rachel-chen.jpg" title="Rachel Chen" description="Engineering Lead" body="Reviewed the latest pull request and left comments on the auth middleware changes. Need to discuss the token rotation approach before merging." />
```

### Icon

**Do** — Keep the lead icon box compact with an 18px glyph so it reads as a tidy lead affordance.

```tsx
<MediaObject bordered start title="Security first" description="End-to-end encryption with automatic key rotation." icon={<Icon shield primary size={18} />} />
```

**Don't** — An oversized icon box throws off the optical balance with the two-line text.

```tsx
<View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 16, maxWidth: 480 }}>
  <View style={{ flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.15), padding: 8 }}>
    <Icon shield primary size={32} />
  </View>
  <View style={{ minWidth: 0, flexGrow: 1, flexShrink: 1, flexBasis: "0%", gap: 2 }}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground }}>Security first</Text>
    <Text style={{ fontSize: 12, lineHeight: 18, color: tokens["muted-foreground"] }}>End-to-end encryption with automatic key rotation.</Text>
  </View>
</View>
```

### Action

**Do** — Pass `truncate` so long text clips in place and the trailing action stays pinned right.

```tsx
<MediaObject bordered center truncate src="/ada-lovelace.jpg" title="Ada Lovelace" description="ada.lovelace@analytical-engine.example.com" action={<Button outline small>Invite</Button>} />
```

**Don't** — Without truncation a long email wraps and pushes the trailing button out of alignment.

```tsx
<MediaObject bordered center src="/ada-lovelace.jpg" title="Ada Lovelace" description="ada.lovelace@analytical-engine.example.com" action={<Button outline small>Invite</Button>} />
```
