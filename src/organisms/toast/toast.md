# Toast

A transient notification capsule. Render a `<Toast>` directly, or drive them imperatively: mount a `<ToastProvider>` near your app root and call `toast(...)` from the `useToast()` hook to enqueue auto-dismissing toasts that stack over the app.

On the web and iOS the toast is Dark Factory's pill: the same deep fill in every palette and scheme, a bold white message, a pill with no description (a long message wraps inside the capsule) and a rounder card once a description sits under the message, with the intent glyph, the action and the dismiss in inks that read on the dark fill. Android keeps the Material 3 snackbar on the same fill.

## Usage

Toast is usually driven imperatively: mount a `<ToastProvider>` near your app root, then call the `toast(...)` handle from `useToast()` to enqueue an auto-dismissing capsule that floats over the app. Press the button to fire one. (`AppScreen` is just this demo's stand-in for your app root, so the toast has a screen to float over.)

```tsx
<AppScreen>
  <ToastProvider>
    <WithToast hook={useToast}>
      {({ toast }) => <Button onPress={() => toast({ message: "Profile updated" })}>Show toast</Button>}
    </WithToast>
  </ToastProvider>
</AppScreen>
```

## Variants

### Rendered directly

```tsx
<Toast message="Your changes were saved" description="They are live for everyone." />
```

### Success

```tsx
<Toast success message="Profile updated" />
```

### Destructive

```tsx
<Toast destructive message="Upload failed" />
```

### Warning

```tsx
<Toast warning message="Storage almost full" />
```

### With an action

```tsx
<Toast message="Message archived" action={{ label: "Undo", onPress: () => {} }} />
```

### Dismissible, informational

```tsx
<Toast info message="A new version is available" onDismiss={() => {}} />
```

## Do & Don't

**Do** — Keep a toast to one short, plain message (with an optional one-line description), and pair a destructive or success intent with the matching message.

```tsx
<Toast success message="Copied to clipboard" />
```

**Don't** — Don't crowd a toast with long paragraphs or more than one action; a toast is a glance, not a dialog.

```tsx
<Toast
  message="We were unable to complete your request because the server returned an unexpected error and the operation was rolled back"
/>
```
