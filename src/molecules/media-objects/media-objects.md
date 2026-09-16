# MediaObject

Image or icon paired with text content. The fundamental building block for list items, notifications, and comment layouts.

## Usage

```tsx
<MediaObject
  avatar="RC"
  title="Rachel Chen"
  description="Engineering Lead"
  body="Reviewed the latest pull request and left comments on the auth middleware changes."
  start
  bordered
/>
```

## Variants

### Tappable

Passing `onPress` makes the whole row a single tap target; wire it to your own
handler and every tap runs it. Here the line underneath reports which row was
tapped. (`Stateful` is a docs-only helper that holds the example's state; in
your app that state is your own.)

```tsx
<Stateful initial="">
  {(opened, setOpened) => (
    <Container lg>
      <Column snug>
        <MediaObject onPress={() => setOpened("Rachel Chen")} bordered center avatar="RC" title="Rachel Chen" description="Engineering Lead" meta="admin" truncate />
        <MediaObject onPress={() => setOpened("Ada Lovelace")} bordered center avatar="AL" title="Ada Lovelace" description="Staff Engineer" meta="2h ago" truncate />
        <Typography muted>{opened === "" ? "No profile opened yet" : `Opened ${opened}'s profile`}</Typography>
      </Column>
    </Container>
  )}
</Stateful>
```

### Icon

```tsx
<Container xl>
  <Column cozy>
    <MediaObject bordered start title="Security first" description="End-to-end encryption with automatic key rotation." icon={<Icon shield primary size={18} />} />
    <MediaObject bordered start title="Real-time analytics" description="Live dashboards with sub-second refresh latency." icon={<Icon activity primary size={18} />} />
  </Column>
</Container>
```

### Action

The trailing `action` slot takes any control; the button's `onPress` is yours to
wire, and the line underneath reports each press.

```tsx
<Stateful initial={0}>
  {(invites, setInvites) => (
    <Container lg>
      <Column snug>
        <MediaObject bordered center truncate src="/ada-lovelace.jpg" title="Ada Lovelace" description="ada@example.com" action={<Button outline small onPress={() => setInvites(invites + 1)}>Invite</Button>} />
        <Typography muted>{invites === 0 ? "No invite sent yet" : `Invite sent ${invites} ${invites === 1 ? "time" : "times"}`}</Typography>
      </Column>
    </Container>
  )}
</Stateful>
```

### Compact

```tsx
<Container xs>
  <Column cozy>
    <MediaObject avatar="RC" title="Rachel Chen" description="rachel.chen@example.com" />
    <MediaObject compact avatar="RC" title="Rachel Chen" description="rachel.chen@example.com" />
  </Column>
</Container>
```

### Bare row with meta

```tsx
<Container lg>
  <Column snug>
    <MediaObject center truncate avatar="RC" title="Rachel Chen" description="Commented on the deploy pipeline." meta="1h" />
    <MediaObject center truncate avatar="AL" title="Ada Lovelace" description="Pushed 3 commits to main." meta="2h" />
  </Column>
</Container>
```

## Do & Don't

### Avatar

**Do** — Top-align with `start` so the avatar anchors to the first line of the title.

```tsx
<Container lg>
  <MediaObject bordered start src="/rachel-chen.jpg" title="Rachel Chen" description="Engineering Lead" body="Reviewed the latest pull request and left comments on the auth middleware changes. Need to discuss the token rotation approach before merging." />
</Container>
```

**Don't** — Centering the avatar against a multi-line body leaves it floating beside the middle of the text.

```tsx
<Container lg>
  <MediaObject bordered center src="/rachel-chen.jpg" title="Rachel Chen" description="Engineering Lead" body="Reviewed the latest pull request and left comments on the auth middleware changes. Need to discuss the token rotation approach before merging." />
</Container>
```

### Icon

**Do** — Keep the lead icon box compact with an 18px glyph so it reads as a tidy lead affordance.

```tsx
<Container lg>
  <MediaObject bordered start title="Security first" description="End-to-end encryption with automatic key rotation." icon={<Icon shield primary size={18} />} />
</Container>
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
<Container lg>
  <MediaObject bordered center truncate src="/ada-lovelace.jpg" title="Ada Lovelace" description="ada.lovelace@analytical-engine.example.com" action={<Button outline small>Invite</Button>} />
</Container>
```

**Don't** — Without truncation a long email wraps and pushes the trailing button out of alignment.

```tsx
<Container xs>
  <MediaObject bordered center src="/ada-lovelace.jpg" title="Ada Lovelace" description="ada.lovelace@analytical-engine.example.com" action={<Button outline small>Invite</Button>} />
</Container>
```
