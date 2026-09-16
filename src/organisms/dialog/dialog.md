# Dialog

A modal dialog: a centered panel over a dimmed, blurred backdrop, with a title, an optional description, a body for real content like a form, and right-aligned actions. Use it for a focused task that warrants interrupting the page; reach for the Alert Dialog for a terse yes/no confirmation.

On light glass, the description and currency prefix use the stronger foreground color. For custom body content, use the default `Typography` foreground for message copy over the dimmed background.

Browser Escape and iOS accessibility escape cancel the foremost open child
overlay before the dialog. Cancelling the dialog calls `onCancel` and requests
`open=false`, including destructive dialogs and dialogs with custom children.
A controlled owner may keep it open; that request never confirms an action.

## Usage

```tsx
<Dialog
  trigger="Open dialog"
  title="Refund payment"
  description="The refund posts to the original card in 2 to 3 business days."
  withBody
/>
```

## Variants

### Extra small

```tsx
<Dialog trigger="Open dialog" title="Refund payment" xs />
```

### Small

```tsx
<Dialog trigger="Open dialog" title="Refund payment" small />
```

### Medium

```tsx
<Dialog trigger="Open dialog" title="Refund payment" medium />
```

### Large

```tsx
<Dialog trigger="Open dialog" title="Refund payment" large />
```

### Wide

```tsx
<Dialog trigger="Open dialog" title="Refund payment" wide />
```

### Destructive action

```tsx
<Dialog trigger="Delete workspace" title="Delete workspace" destructive confirmLabel="Delete" />
```

## Do & Don't

### When to use

**Do** — Use the Dialog for a focused task with real content, like a short form.

```tsx
<Dialog open large>
  <Column relaxed>
    <Column tight>
      <Typography lead semibold>Edit profile</Typography>
      <Typography>Update how your name and email appear to teammates.</Typography>
    </Column>
    <Column relaxed>
      <Input label="Name" defaultValue="Ada Lovelace" />
      <Input label="Email" defaultValue="ada@example.com" />
    </Column>
    <Row end snug alignCenter>
      <Button outline small>Cancel</Button>
      <Button primary small>Save changes</Button>
    </Row>
  </Column>
</Dialog>
```

**Don't** — A bare yes/no question does not need the roomier Dialog; that is what the Alert Dialog is for.

```tsx
<Dialog open title="Delete file?" small destructive confirmLabel="Delete" cancelLabel="Cancel" />
```

### Description

**Do** — Keep the description to one supporting line; link out for the full policy.

```tsx
<Dialog open title="Refund payment" description="The refund posts to the original card in 2 to 3 business days." medium confirmLabel="Refund" cancelLabel="Cancel" />
```

**Don't** — A multi-sentence policy dump in the description buries the task under reading.

```tsx
<Dialog open title="Refund payment" description="Refunds are processed through the original payment method. Depending on the bank, the amount can take 2 to 3 business days to appear. Partial refunds are supported. Once submitted a refund cannot be cancelled, and the payout for this period will be adjusted on your next statement." medium confirmLabel="Refund" cancelLabel="Cancel" />
```

### Body form

**Do** — Keep the body to the few fields the task needs; send long forms to a full page.

```tsx
<Dialog open large>
  <Column relaxed>
    <Typography lead semibold>Create project</Typography>
    <Column relaxed>
      <Input label="Name" placeholder="Acme website" />
      <Input label="Key" placeholder="ACME" />
    </Column>
    <Row end snug alignCenter>
      <Button outline small>Cancel</Button>
      <Button primary small>Create</Button>
    </Row>
  </Column>
</Dialog>
```

**Don't** — A seven-field form crammed into a small dialog feels like a page stuffed into a popup.

```tsx
<Dialog open small>
  <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "600", color: tokens["popover-foreground"] }}>Create project</Text>
  <View style={{ marginTop: 20 }}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6 }}>Name</Text>
    <Input accessibilityLabel="Name" />
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6, marginTop: 12 }}>Key</Text>
    <Input accessibilityLabel="Key" />
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6, marginTop: 12 }}>Description</Text>
    <Input accessibilityLabel="Description" />
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6, marginTop: 12 }}>Lead</Text>
    <Input accessibilityLabel="Lead" />
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6, marginTop: 12 }}>Team</Text>
    <Input accessibilityLabel="Team" />
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6, marginTop: 12 }}>Visibility</Text>
    <Input accessibilityLabel="Visibility" />
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6, marginTop: 12 }}>Template</Text>
    <Input accessibilityLabel="Template" />
  </View>
  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
    <Button outline small>Cancel</Button>
    <Button primary small>Create</Button>
  </View>
</Dialog>
```

### Actions

**Do** — One primary plus quieter secondaries, right-aligned and labeled with their verb.

```tsx
<Dialog open medium>
  <Column relaxed>
    <Column tight>
      <Typography lead semibold>Unsaved changes</Typography>
      <Typography>You have edits that are not saved.</Typography>
    </Column>
    <Row end snug alignCenter wrap>
      <Button ghost small>Discard</Button>
      <Button outline small>Keep editing</Button>
      <Button primary small>Save</Button>
    </Row>
  </Column>
</Dialog>
```

**Don't** — Three look-alike primary buttons give no signal about the default, safe choice.

```tsx
<Dialog open medium>
  <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "600", color: tokens["popover-foreground"] }}>Unsaved changes</Text>
  <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"], marginTop: 8 }}>You have edits that are not saved.</Text>
  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
    <Button primary small>Save</Button>
    <Button primary small>Discard</Button>
    <Button primary small>Keep editing</Button>
  </View>
</Dialog>
```

### Destructive action

**Do** — Reserve the destructive tone for the irreversible action it names.

```tsx
<Dialog open title="Delete workspace" description="This removes all projects and cannot be undone." medium destructive confirmLabel="Delete" cancelLabel="Cancel" />
```

**Don't** — A red button on a routine Save trains users to ignore the colour that should mean danger.

```tsx
<Dialog open title="Save changes" description="Update the profile with your edits." medium destructive confirmLabel="Save" cancelLabel="Cancel" />
```

### Size

**Do** — Size the dialog to its content: a single field belongs in xs or sm.

```tsx
<Dialog open small>
  <Column relaxed>
    <Typography lead semibold>Rename</Typography>
    <Input label="Name" defaultValue="Untitled" />
    <Row end snug alignCenter>
      <Button outline small>Cancel</Button>
      <Button primary small>Save</Button>
    </Row>
  </Column>
</Dialog>
```

**Don't** — A 2xl panel around a single field leaves a vast empty expanse beside the input.

```tsx
<Dialog open wide>
  <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "600", color: tokens["popover-foreground"] }}>Rename</Text>
  <View style={{ marginTop: 20 }}>
    <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens.foreground, marginBottom: 6 }}>Name</Text>
    <Input accessibilityLabel="Name" value="Untitled" />
  </View>
  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
    <Button outline small>Cancel</Button>
    <Button primary small>Save</Button>
  </View>
</Dialog>
```
