# ActionSheet

The iOS modal action menu: a bottom sheet of choices summoned in response to a user action. It poses an optional title and message, lists a set of actions (any of which can be destructive), and offers a Cancel. Selecting an action runs it and closes the sheet; tapping the scrim or Cancel closes it without acting. Pass a `trigger` label for a self-contained button that opens the sheet, or drive `open` / `onOpenChange` yourself. For a small contextual menu anchored to a control, reach for Dropdown or RowMenu instead.

On light glass, muted header text uses the stronger surface foreground to remain readable over the dimmed background.

iOS accessibility escape and Android system back request cancellation without
running an action. An open child overlay handles the request first. Disabled
actions do not disable cancellation, and a controlled owner can keep the sheet
open. The visible Cancel row remains available to assistive technology.

## Usage

```tsx
<ActionSheet
  trigger="Add photo"
  actions={[
    { label: "Take Photo", onPress: () => {} },
    { label: "Choose from Library", onPress: () => {} }
  ]}
/>
```

## Variants

### With a title and message

```tsx
<ActionSheet
  trigger="Discard draft…"
  title="Discard draft?"
  message="Your unsaved changes will be lost."
  actions={[
    { label: "Discard Changes", onPress: () => {} },
    { label: "Keep Editing", onPress: () => {} }
  ]}
/>
```

### Destructive action

```tsx
<ActionSheet
  trigger="File options"
  actions={[
    { label: "Move to Folder", onPress: () => {} },
    { label: "Delete File", destructive: true, onPress: () => {} }
  ]}
/>
```

### Disabled action

```tsx
<ActionSheet
  trigger="File options"
  actions={[
    { label: "Save", onPress: () => {} },
    { label: "Save As…", disabled: true, onPress: () => {} }
  ]}
/>
```

### Controlled

```tsx
<Stateful initial={false}>
  {(open, setOpen) => (
    <>
      <Button onPress={() => setOpen(true)}>Share…</Button>
      <ActionSheet
        open={open}
        onOpenChange={setOpen}
        actions={[
          { label: "Copy Link", onPress: () => {} },
          { label: "Send by Email", onPress: () => {} }
        ]}
      />
    </>
  )}
</Stateful>
```

## Do & Don't

### Right tool for the job

**Do** — Use an Action Sheet for a short list of choices triggered by a user action, with the dangerous option marked destructive.

```tsx
<ActionSheet
  trigger="Add photo"
  title="Photo"
  actions={[
    { label: "Take Photo", onPress: () => {} },
    { label: "Choose from Library", onPress: () => {} },
    { label: "Remove Photo", destructive: true, onPress: () => {} },
  ]}
/>
```

**Don't** — Use an Action Sheet for a single yes/no confirmation; an Alert Dialog is the focused tool for that.

```tsx
<ActionSheet
  trigger="Confirm"
  title="Are you sure?"
  actions={[{ label: "OK", onPress: () => {} }]}
/>
```

### Name the action, not a generic verb

**Do** — Label each row with the action it performs (Take Photo, Delete File, Move).

```tsx
<ActionSheet
  trigger="File options"
  actions={[
    { label: "Delete File", destructive: true, onPress: () => {} },
    { label: "Move to Folder", onPress: () => {} },
  ]}
/>
```

**Don't** — Generic labels force the user to re-read the title to know what each row does.

```tsx
<ActionSheet
  trigger="Delete file…"
  title="Delete file?"
  actions={[
    { label: "Yes", destructive: true, onPress: () => {} },
    { label: "No", onPress: () => {} },
  ]}
/>
```
