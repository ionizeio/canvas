# Alert

Inline notification banners: info, success, warning, and destructive, plus a full-width announcement bar. A banner fills the parent it is given, so a column of alerts is the same measure top to bottom and a banner over a form lines up with the fields; a Container step sets the measure when the layout calls for one. For a blocking confirmation prompt, see Alert Dialog.

A toned banner is Dark Factory's soft panel: the tone's wash with no border, the title in the tone's color, the body in the foreground, and the icon in the tone's solid color, from `statusColors` (the helper Badge and every toned surface read). The neutral banner is the card with a hairline.

## Usage

Pressing the trailing "×" (`dismissible`) hides the banner out of the box; `onDismiss` reports it, and a controlled `dismissed` prop hands that state to the parent instead. Action buttons are real Buttons: wire each one's `onPress`.

```tsx
<Alert
  info
  icon={<Icon info size={16} />}
  title="Heads up"
  description="Maintenance window scheduled for Sunday 2:00 UTC."
/>
```

## Variants

### Success

```tsx
<Alert
  success
  icon="✓"
  title="All set"
  description="Your changes have been saved successfully."
/>
```

### Warning

```tsx
<Alert
  warning
  icon={<Icon alertTriangle size={16} />}
  title="Action required"
  description="Your trial expires in 3 days."
/>
```

### Destructive

```tsx
<Alert
  destructive
  icon="✕"
  title="Something went wrong"
  description="Could not save your changes. Please try again."
/>
```

### Neutral

```tsx
<Alert
  icon={<Icon bell size={16} />}
  title="Scheduled maintenance"
  description="The dashboard may be briefly unavailable on Sunday between 2:00 and 3:00 UTC."
/>
```

### Dismissible

```tsx
<Alert
  info
  icon={<Icon info size={16} />}
  title="Heads up"
  description="Maintenance window scheduled for Sunday 2:00 UTC."
  dismissible
/>
```

### Actions

```tsx
<Alert
  warning
  icon={<Icon alertTriangle size={16} />}
  title="Action required"
  description="Your trial expires in 3 days."
  actions={<Button primary small>Upgrade plan</Button>}
/>
```

### Measures come from the parent

```tsx
<Column snug>
  <Container xs start>
    <Alert title="In an xs Container" description="The banner fills the 320px step, the measure of a short form." />
  </Container>
  <Alert title="Bare" description="No container of its own: the banner fills whatever parent it sits in." />
</Column>
```

### Rich body

```tsx
<Alert title="Design token renamed">
  <Typography small muted>
    The field underline now reads from <Typography code>--p-field-underline</Typography> instead of a raw hex value; update any local overrides before upgrading.
  </Typography>
</Alert>
```

## Do & Don't

### info

**Do**: Reserve info for passive, non-urgent context (notices, tips); escalate to warning or destructive when action is required.

```tsx
<Alert info icon={<Icon info size={16} />} title="Heads up" description="Maintenance window scheduled for Sunday 2:00 UTC." />
```

**Don't**: Dressing an act-now message in the neutral info tone hides the urgency; users skim past it like an FYI.

```tsx
<Alert info icon={<Icon info size={16} />} title="Trial expires today" description="Upgrade now or you'll lose access to your projects." />
```

### success

**Do**: Make confirmations transient: auto-dismiss or give a Dismiss control so the success state clears once acknowledged.

```tsx
<Alert
  success
  icon="✓"
  title="Saved"
  description="Your changes have been saved successfully."
  dismissible
/>
```

**Don't**: A success banner pinned with no way to dismiss it lingers as visual noise long after the action is done.

```tsx
<Alert success icon="✓" title="Saved" description="Your changes have been saved successfully." />
```

### warning

**Do**: State the consequence, the deadline, and the action: name what's wrong and give a button to resolve it.

```tsx
<Alert
  warning
  icon={<Icon alertTriangle size={16} />}
  title="Action required"
  description="Your trial expires in 3 days. Upgrade to keep your projects."
  actions={<Button primary small>Upgrade plan</Button>}
/>
```

**Don't**: A warning with no specifics or next step leaves the user guessing what to fix and by when.

```tsx
<Alert warning icon={<Icon alertTriangle size={16} />} title="Action required" description="Something needs your attention." />
```

### destructive

**Do**: Match the variant to the severity: reserve destructive for genuine failures, success for confirmations.

```tsx
<Alert destructive icon="✕" title="Something went wrong" description="Could not save your changes. Please try again." />
```

**Don't**: Using the destructive variant for non-errors cries wolf; users learn to tune out red and miss real failures.

```tsx
<Alert destructive icon="✕" title="Saved" description="Your changes have been saved successfully." />
```
