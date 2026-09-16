# AlertDialog

Catalyst-style confirmation dialog: a centered panel over a dimmed, blurred backdrop, with a title, description, optional body, and action buttons. Reserve it for decisions that must block the rest of the app.

Browser Escape and iOS accessibility escape cancel the dialog, clear its
confirmation field and request `open=false`. The confirmation text gates only
the confirm action; cancellation remains available while confirm is disabled.
An open child overlay handles dismissal first. A controlled owner can refuse
closure without passing that request to a parent or calling `onConfirm`.

## Usage

```tsx
<AlertDialog
  title="Delete this identity?"
  description="This permanently removes the identity and revokes any active sessions. This action cannot be undone."
  confirmLabel="Delete"
  destructive
  trigger="Delete identity…"
/>
```

## Variants

### Narrow

```tsx
<AlertDialog
  narrow
  title="Sign out?"
  confirmLabel="Sign out"
  trigger="Sign out…"
/>
```

### Small

```tsx
<AlertDialog
  small
  title="Transfer ownership?"
  description="You will lose admin access to this workspace."
  confirmLabel="Transfer"
  trigger="Transfer ownership…"
/>
```

### Large

```tsx
<AlertDialog
  large
  title="Transfer ownership?"
  description="You will lose admin access to this workspace, and the new owner can remove you from it. Billing, integrations, and the audit history move with the workspace."
  confirmLabel="Transfer"
  trigger="Transfer ownership…"
/>
```

### Body field

`withInput` renders a confirmation field that gates the confirm action: the user
must type the `confirmText` token (default `"DELETE"`) exactly before the confirm
button enables, so it is a real safety check rather than a decorative field. Pass
`confirmText` to require a different token.

```tsx
<AlertDialog
  title="Delete this identity?"
  description="This permanently removes the identity and revokes any active sessions. This action cannot be undone."
  confirmLabel="Delete"
  destructive
  withInput
  trigger="Delete identity…"
/>
```

### Controlled

Drive the open state from outside the dialog: omit `trigger`, own `open` yourself,
and pass `onOpenChange` so every way the dialog closes (confirm, cancel, browser
Escape or iOS accessibility escape) reports back and keeps your state in sync. (`Stateful` is a
docs-only state holder; in an app you would hold `open` with `useState`.)

```tsx
<Stateful initial={false}>
  {(open, setOpen) => (
    <Column relaxed>
      <Button onPress={() => setOpen(true)}>Transfer ownership…</Button>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Transfer ownership?"
        description="You will lose admin access to this workspace."
        confirmLabel="Transfer"
      />
    </Column>
  )}
</Stateful>
```

## Do & Don't

### Reserve the dialog for blocking decisions

**Do** — Use an inline banner or toast for passive feedback; reserve the dialog for decisions that must be confirmed.

```tsx
<Alert success title="Saved" description="Your changes have been saved." />
```

**Don't** — A blocking alert dialog for passive confirmation interrupts the user for no reason.

```tsx
<AlertDialog small title="Saved" description="Your changes have been saved." confirmLabel="OK" trigger="Save changes" />
```

### Name the action on the confirm button

**Do** — Label the confirm button with the verb it performs (Delete, Archive, Sign out).

```tsx
<AlertDialog small destructive title="Delete this identity?" cancelLabel="Cancel" confirmLabel="Delete" trigger="Delete identity…" />
```

**Don't** — Generic Yes / No forces the user to re-read the title to know what they are confirming.

```tsx
<AlertDialog small destructive title="Delete this identity?" cancelLabel="No" confirmLabel="Yes" trigger="Delete identity…" />
```

### xs

**Do** — Reserve xs for a terse one-line question with short button labels and no body content.

```tsx
<AlertDialog narrow destructive title="Remove device?" cancelLabel="Cancel" confirmLabel="Remove" trigger="Remove device…" />
```

**Don't** — A long title, multi-line description, and wordy buttons get cramped in the xs width and wrap awkwardly.

```tsx
<AlertDialog narrow destructive title="Remove this trusted device?" description="It will need to re-authenticate, and any pending background syncs from it will be cancelled the next time it connects." cancelLabel="Cancel" confirmLabel="Remove device" trigger="Remove device…" />
```

### sm

**Do** — Use sm for a single short confirmation with a one-line description; move real forms to a full dialog.

```tsx
<AlertDialog small title="Transfer ownership?" description="You will lose admin access to this workspace." cancelLabel="Cancel" confirmLabel="Transfer" trigger="Transfer ownership…" />
```

**Don't** — Packing a multi-field form into sm makes it feel like a form crammed into a confirmation popup.

```tsx
<View style={{ alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: alpha("#000000", 0.5), padding: 32, minHeight: 200 }}>
  <View style={{ width: 384, maxWidth: "100%", borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.popover, padding: 24, ...shadow("xl") }}>
    <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "600", color: tokens["popover-foreground"] }}>Transfer ownership</Text>
    <View style={{ marginTop: 16, gap: 16 }}>
      <View>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6 }}>New owner email</Text>
        <Input placeholder="owner@example.com" />
      </View>
      <View>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6 }}>Reason</Text>
        <Input placeholder="Optional note" />
      </View>
      <View>
        <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6 }}>Type TRANSFER to confirm</Text>
        <Input placeholder="TRANSFER" />
      </View>
    </View>
    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
      <Button outline small>Cancel</Button>
      <Button primary small>Transfer</Button>
    </View>
  </View>
</View>
```

### md

**Do** — md is the default home for a typical destructive confirm with a sentence or two of description.

```tsx
<AlertDialog destructive title="Delete this identity?" description="This permanently removes the identity and revokes any active sessions. This action cannot be undone." cancelLabel="Cancel" confirmLabel="Delete" trigger="Delete identity…" />
```

**Don't** — Squeezing a description-carrying confirm into a smaller width crowds the copy against the edges.

```tsx
<AlertDialog narrow destructive title="Delete this identity?" description="This permanently removes the identity and revokes any active sessions. This action cannot be undone." cancelLabel="Cancel" confirmLabel="Delete" trigger="Delete identity…" />
```

### lg

**Do** — Reserve lg for dialogs that earn the width: a body field or a longer explanation to read.

```tsx
<AlertDialog large destructive withInput title="Delete this identity?" description="This permanently removes the identity and revokes any active sessions. This action cannot be undone." cancelLabel="Cancel" confirmLabel="Delete" trigger="Delete identity…" />
```

**Don't** — A bare yes/no in lg leaves a wide, empty panel that reads as heavier than the trivial decision it asks for.

```tsx
<AlertDialog large title="Sign out?" cancelLabel="Cancel" confirmLabel="Sign out" trigger="Sign out…" />
```
