# Switch

On / off switch, isolated or grouped in a settings list.

Pass `ref` to access the interactive switch row, including its label. Use `useRef<ComponentRef<typeof Switch>>(null)` from React, or `useRef<View>(null)` with React Native's `View` type. Object and callback refs are supported and detach on unmount. Calling `ref.current?.focus()` or `.blur()` delegates to the host without activating the control. Browser focus is supported; native focus depends on the platform and React Native version, and is separate from accessibility focus.

On the web, Space activates the focused control on key release, and Enter also activates it. Holding Space does not repeat the change. Moving focus away, disabling the control, or composing text cancels a pending Space press.

## Usage

```tsx
<Switch defaultChecked>Available to chat</Switch>
```

## Variants

### Off

```tsx
<Switch>Available to chat</Switch>
```

### With description

```tsx
<Switch description="Show your availability to teammates.">Available to chat</Switch>
```

### Disabled

```tsx
<Switch disabled>Available to chat</Switch>
```

### Controlled

```tsx
<Stateful initial={true}>
  {(on, setOn) => <Switch checked={on} onChange={setOn}>Notifications</Switch>}
</Stateful>
```

### Settings list

```tsx
<Column relaxed>
  <Switch defaultChecked>Available to chat</Switch>
  <Switch>Weekly digest</Switch>
  <Switch defaultChecked>Push notifications</Switch>
</Column>
```

## Do & Don't

### Off

**Do** — Keep the standard input-colored off track so off stays clearly interactive and distinct from a disabled control.

```tsx
<Switch>Two-factor auth</Switch>
```

**Don't** — A washed-out off track reads as disabled, so users can't tell the switch is simply off versus locked.

```tsx
<Pressable style={{ maxWidth: 280, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground }}>Two-factor auth</Text>
  <View style={{ position: "relative", flexShrink: 0, borderRadius: 9999, width: 36, height: 20, backgroundColor: alpha(tokens.muted, 0.3) }}>
    <View style={{ position: "absolute", top: 2, left: 2, borderRadius: 9999, width: 16, height: 16, backgroundColor: tokens.muted }} />
  </View>
</Pressable>
```

### On

**Do** — Reserve the on switch for instantly reversible settings; route irreversible actions through a button plus confirmation.

```tsx
<Column cozy alignStart>
  <Switch defaultChecked>Auto-save drafts</Switch>
  <Button destructive small>Delete account…</Button>
</Column>
```

**Don't** — A switch applies instantly; wiring an on toggle to an irreversible action invites accidental, unconfirmed data loss.

```tsx
<Pressable style={{ maxWidth: 280, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["destructive-text"] ?? tokens.destructive }}>Permanently delete account</Text>
  <View style={{ position: "relative", flexShrink: 0, borderRadius: 9999, width: 36, height: 20, backgroundColor: tokens.primary }}>
    <View style={{ position: "absolute", top: 2, right: 2, borderRadius: 9999, width: 16, height: 16, backgroundColor: tokens.background, ...shadow() }} />
  </View>
</Pressable>
```

**Do** — Label the setting, not the state; the switch communicates on or off.

```tsx
<Switch defaultChecked>Notifications</Switch>
```

**Don't** — An On/Off label duplicates what the switch position already shows.

```tsx
<View style={{ maxWidth: 280, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
  <Text style={{ fontSize: 13 }}>Notifications</Text>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Off</Text>
    <Switch />
    <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>On</Text>
  </View>
</View>
```
