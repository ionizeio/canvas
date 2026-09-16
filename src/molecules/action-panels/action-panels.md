# ActionPanel

Section card with headline, body text, and a primary action. Used to surface a single decision or call-to-action.

## Usage

The panel's single action fires `onAction`; wire it to your own handler and every
press runs it.

```tsx
<ActionPanel
  title="Export your data"
  description="Download everything in this workspace as a ZIP archive."
  actionLabel="Export"
/>
```

## Variants

### Destructive

```tsx
<ActionPanel
  title="Delete this project"
  description="Once you delete a project, there is no going back."
  actionLabel="Delete project"
  destructive
/>
```

### Inline

```tsx
<ActionPanel
  title="Weekly digest"
  description="A summary of workspace activity, sent every Monday."
  actionLabel="Subscribe"
  inline
/>
```

### Toggle

```tsx
<ActionPanel
  title="Two-factor authentication"
  description="Require a verification code on every login."
  toggle
/>
```

### Embedded fields

```tsx
<ActionPanel
  title="Workspace profile"
  description="These details appear on every invoice."
  actionLabel="Save changes"
>
  <Input label="Workspace name" defaultValue="Northwind" />
  <Input label="Billing email" defaultValue="billing@northwind.com" />
</ActionPanel>
```

### Fields under a pinned action

```tsx
<ActionPanel
  title="Two-factor authentication"
  description="Require a verification code on every login."
  toggle
>
  <Input label="Recovery phone" defaultValue="+1 555 0148" />
</ActionPanel>
```

### Confirm before delete

```tsx
<Stateful initial={false}>
  {(open, setOpen) => (
    <Container md>
      <ActionPanel
        title="Delete this project"
        description="Once you delete a project, there is no going back."
        actionLabel="Delete project"
        destructive
        onAction={() => setOpen(true)}
      />
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        title="Delete this project?"
        description="This permanently removes the project and its data."
        confirmLabel="Delete"
      />
    </Container>
  )}
</Stateful>
```

## Do & Don't

### Simple

**Do** — Spell out the consequence above the button so the stakes are clear before the click.

```tsx
<ActionPanel title="Delete this project" description="Once you delete a project, there is no going back. Please be certain." actionLabel="Delete project" destructive />
```

**Don't** — A destructive action with no consequence copy invites accidental, irreversible clicks.

```tsx
<ActionPanel title="Delete this project" actionLabel="Delete project" destructive />
```

### With toggle

**Do** — Pair the switch with a one-line explanation of what turning it on or off does.

```tsx
<ActionPanel title="Two-factor authentication" description="Add an extra layer of security to your account by requiring a verification code on login." toggle defaultChecked />
```

**Don't** — A bare switch with no description leaves the user guessing what flipping it actually changes.

```tsx
<ActionPanel title="Two-factor authentication" toggle defaultChecked />
```
