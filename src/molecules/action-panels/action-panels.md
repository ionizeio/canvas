# ActionPanel

Section card with headline, body text, and a primary action. Used to surface a single decision or call-to-action.

## Usage

The panel's single action fires `onAction`; wire it to your own handler and every
press runs it. Here each press commits the delete, and the line underneath reports
the result. (`Stateful` is a docs-only helper that holds the example's state; in
your app that state is your own.)

```tsx
<Stateful initial={0}>
  {(deletes, setDeletes) => (
    <Column snug>
      <ActionPanel
        title="Delete this project"
        description="Once you delete a project, there is no going back. Please be certain."
        actionLabel="Delete project"
        destructive
        onAction={() => setDeletes(deletes + 1)}
      />
      <Typography muted>{deletes === 0 ? "Nothing deleted yet" : `Delete fired ${deletes} ${deletes === 1 ? "time" : "times"}`}</Typography>
    </Column>
  )}
</Stateful>
```

## Variants

### Inline

```tsx
<Stateful initial={0}>
  {(discards, setDiscards) => (
    <Column snug>
      <ActionPanel
        title="Discard unsaved changes?"
        description="You have unsaved edits in this form. Leaving now will lose all progress."
        actionLabel="Discard"
        destructive
        inline
        onAction={() => setDiscards(discards + 1)}
      />
      <Typography muted>{discards === 0 ? "No edits discarded yet" : `Discarded ${discards} ${discards === 1 ? "time" : "times"}`}</Typography>
    </Column>
  )}
</Stateful>
```

### Toggle

```tsx
<ActionPanel
  title="Two-factor authentication"
  description="Add an extra layer of security to your account by requiring a verification code on login."
  toggle
  defaultChecked
/>
```

### Embedded fields

```tsx
<ActionPanel
  title="Workspace profile"
  description="These details appear on every invoice this workspace sends out."
  actionLabel="Save changes"
>
  <Input label="Workspace name" defaultValue="Northwind" />
  <Input label="Billing email" defaultValue="billing@northwind.com" />
  <Input label="VAT number" defaultValue="GB123456789" />
</ActionPanel>
```

### Fields under a pinned action

```tsx
<ActionPanel
  title="Two-factor authentication"
  description="Add an extra layer of security to your account by requiring a verification code on login."
  toggle
  defaultChecked
>
  <Input label="Recovery phone" defaultValue="+1 555 0148" />
</ActionPanel>
```

### Confirm before delete

```tsx
<Stateful initial={false}>
  {(open, setOpen) => (
    <Column snug>
      <ActionPanel
        title="Delete this project"
        description="Once you delete a project, there is no going back. Please be certain."
        actionLabel="Delete project"
        destructive
        onAction={() => setOpen(true)}
      />
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        title="Delete this project?"
        description="This permanently removes the project and all of its data. This action cannot be undone."
        confirmLabel="Delete"
      />
    </Column>
  )}
</Stateful>
```

## Do & Don't

### Simple

**Do** — Spell out the consequence above the button so the stakes are clear before the click.

```tsx
<ActionPanel title="Delete this project" description="Once you delete a project, there is no going back. Please be certain." actionLabel="Delete project" destructive style={{ maxWidth: 420 }} />
```

**Don't** — A destructive action with no consequence copy invites accidental, irreversible clicks.

```tsx
<ActionPanel title="Delete this project" actionLabel="Delete project" destructive style={{ maxWidth: 420 }} />
```

### With toggle

**Do** — Pair the switch with a one-line explanation of what turning it on or off does.

```tsx
<ActionPanel title="Two-factor authentication" description="Add an extra layer of security to your account by requiring a verification code on login." toggle defaultChecked style={{ maxWidth: 460 }} />
```

**Don't** — A bare switch with no description leaves the user guessing what flipping it actually changes.

```tsx
<ActionPanel title="Two-factor authentication" toggle defaultChecked style={{ maxWidth: 460 }} />
```
