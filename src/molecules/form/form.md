# Form

Stitch your own fields; Form adds the rhythm, the sections, the actions row, and submit.

## Usage

On the web, Enter confirms an active Autocomplete suggestion before it can submit the form. A subsequent Enter submits after the list closes. Enter used to confirm an input-method candidate never submits, and holding Enter does not repeat submission. Multiline fields retain Enter for newlines. On native platforms, each field's `onSubmitEditing` owns the return-key action.

Form is a composition surface: you stitch the field atoms as children and keep their state; Form supplies the vertical rhythm, the actions row, and `onSubmit`, which fires from the submit button or from Enter in a single-line field on the web. 

```tsx
<Form submitLabel="Sign in">
  <Input label="Email" placeholder="you@example.com" />
  <Input label="Password" />
</Form>
```

## Variants

### Two-column

```tsx
<Form twoColumn submitLabel="Create">
  <Input label="First name" placeholder="Ada" />
  <Input label="Last name" placeholder="King" />
  <Input label="Email" placeholder="ada@example.com" />
</Form>
```

### Measure

```tsx
<Form sm start submitLabel="Sign in">
  <Input label="Email" placeholder="sm step, pinned to the start (384)" />
  <Input label="Password" />
</Form>
```

### Sections

```tsx
<Form submitLabel="Save">
  <FormSection title="Personal info" description="This information will be displayed on your public profile.">
    <Input label="Full name" defaultValue="Rachel Chen" />
    <Input label="Email" defaultValue="rachel@example.com" />
  </FormSection>
  <FormSection title="Notifications" description="Choose how you'd like to be notified.">
    <Checkbox defaultChecked>Email notifications</Checkbox>
    <Checkbox>SMS alerts</Checkbox>
  </FormSection>
</Form>
```

### Select and switch controls

```tsx
<Form submitLabel="Save">
  <Select label="Role" options={["Admin", "Editor", "Viewer"]} defaultValue="Editor" />
  <Switch defaultChecked>Notifications</Switch>
</Form>
```

## Do & Don't

### Stacked

**Do** — Keep short forms one field per row so each label sits directly above its input and the eye flows straight down.

```tsx
<Form submitLabel="Sign in">
  <Input label="Email" placeholder="you@example.com" />
  <Input label="Password" />
</Form>
```

**Don't** — Pairing an email and password side by side cramps a sign-in form and breaks the natural top-to-bottom reading order.

```tsx
<Form twoColumn submitLabel="Sign in">
  <Input label="Email" placeholder="you@example.com" />
  <Input label="Password" />
</Form>
```

### Two-column

**Do** — Compose mixed rows inside the stacked form: give a full-width field like the street its own line and pair the similar-width city and ZIP in a Row.

```tsx
<Form submitLabel="Save">
  <Input label="Street address" placeholder="123 Market St" />
  <Row cozy>
    <Column fill>
      <Input label="City" placeholder="San Francisco" />
    </Column>
    <Column fill>
      <Input label="ZIP" placeholder="94103" />
    </Column>
  </Row>
</Form>
```

**Don't** — Putting a wide field next to a tiny one in the same two-column row leaves the short input awkwardly oversized.

```tsx
<Form twoColumn submitLabel="Save">
  <Input label="Street address" placeholder="123 Market St" />
  <Input label="ZIP" placeholder="94103" />
</Form>
```

### Sections

**Do** — Group related fields in a `FormSection` so each cluster carries its heading, its supporting line, and group semantics a screen reader announces.

```tsx
<Form submitLabel="Save">
  <FormSection title="Personal info" description="Displayed on your public profile.">
    <Input label="Full name" defaultValue="Rachel Chen" />
  </FormSection>
  <FormSection title="Billing" description="Used for invoices and receipts.">
    <Input label="Card number" defaultValue="•••• 4242" />
  </FormSection>
</Form>
```

**Don't** — Hand-rolled headings spliced between fields carry no grouping semantics, so assistive tech never hears which section a field belongs to.

```tsx
<View style={{ width: 560, maxWidth: "100%", gap: 16 }}>
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground }}>Personal info</Text>
  <Input label="Full name" defaultValue="Rachel Chen" />
  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: tokens.foreground }}>Billing</Text>
  <Input label="Card number" defaultValue="•••• 4242" />
</View>
```

### Inline form

**Do** — Keep the input and its submit button on one row so the input + action reads as one step.

```tsx
<Card padded>
  <Column relaxed>
    <Column tight>
      <Typography lead semibold>Subscribe to updates</Typography>
      <Typography small muted>We'll send you a weekly digest of what changed.</Typography>
    </Column>
    <Row alignCenter snug>
      <Column fill>
        <Input placeholder="you@example.com" />
      </Column>
      <Button primary>Subscribe</Button>
    </Row>
  </Column>
</Card>
```

**Don't** — Stacking the field above its button breaks the single-decision rhythm and adds a row of dead space.

```tsx
<Card padded style={{ gap: 16 }}>
  <View style={{ gap: 4 }}>
    <Text style={{ fontSize: 15, fontWeight: "600", color: tokens["card-foreground"] }}>Subscribe to updates</Text>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>We'll send you a weekly digest of what changed.</Text>
  </View>
  <Input placeholder="you@example.com" />
  <View style={{ alignItems: "flex-start" }}>
    <Button primary>Subscribe</Button>
  </View>
</Card>
```
