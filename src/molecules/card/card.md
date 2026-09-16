# Card

Three families. `StatCard` = a single metric, big number + delta. `SectionCard` = a labeled content surface with optional header and divider. Generic `card` = bring your own structure. A card with content is padded by default, and a padded surface also spaces its flat children (the card owns the vertical rhythm, so a stack of Typography lines needs no layout wrapper); pass `flush` to opt out of both, the inset and the spacing, for edge-to-edge content (a table, a nav bar) or when you compose the self-padding `CardHeader`/`CardContent`. The section props (`title` / `description` / `icon` / `actions` / `footer`) render self-padding sections, so a sectioned card needs no `padded`. They compose with a string `body` OR with raw children, so a panel can carry a titled header above a table or a form; children win when both are passed. For a cover image, `CardMedia` is the full-bleed top slot: it spans the card edge to edge, its top corners follow the card's corner, and its bottom edge stays flat; compose it with `flush` and let `CardContent` pad the text below. Density: pass `compact` or `comfortable` to tighten or relax the card's own padding and the gap between flat children (`compact` takes precedence, and a density prop pads the surface on its own). `grow` fills the height a parent Row or Column hands the card (the body takes the slack, so a footer stays on its floor); inside a `Grid` cell it is implied, so the tiles of one row are equal-height without being asked.

## Usage

```tsx
<Card>
  <Typography caption medium>Active identities</Typography>
  <Typography h3 bold>12,348</Typography>
  <Typography tiny muted>+142 today</Typography>
</Card>
```

## Variants

### Generic

```tsx
<Card>
  <Typography lead semibold>Anything goes here</Typography>
</Card>
```

### Flat children

```tsx
<Card>
  <Typography lead semibold>The surface owns the rhythm</Typography>
  <Typography small muted>Each line lands a steady step below the last.</Typography>
  <Typography small muted>No layout wrapper between them.</Typography>
</Card>
```

### Flat

```tsx
<Card flat>
  <Typography lead semibold>Outlined and quiet</Typography>
</Card>
```

### Raised

```tsx
<Card raised>
  <Typography lead semibold>Lifted above the page</Typography>
</Card>
```

### Density

```tsx
<Column cozy>
  <Card compact>
    <Typography lead semibold>Compact</Typography>
    <Typography small muted>Tight padding and rhythm.</Typography>
  </Card>
  <Card comfortable>
    <Typography lead semibold>Comfortable</Typography>
    <Typography small muted>Roomy padding and rhythm.</Typography>
  </Card>
</Column>
```

### Section

```tsx
<Card title="Recent activity" body="Two events today." />
```

### Section with children

```tsx
<Card title="Identity">
  <DescriptionList
    items={[
      { term: "ID", value: "6f1c2a" },
      { term: "State", value: "Active" },
    ]}
  />
</Card>
```

### Icon and footer

```tsx
<Card
  title="Identity"
  icon={<Icon user size={16} />}
  body="Name, primary email, and sign-in methods."
  footer="Updated 2 minutes ago"
/>
```

### Media

```tsx
<Card flush>
  <CardMedia src="/kira-tanaka.jpg" alt="Portrait of Kira Tanaka" />
  <CardContent>
    <Typography h5 semibold>Kira Tanaka</Typography>
  </CardContent>
</Card>
```

### Actions

```tsx
<Card flush>
  <CardContent>
    <Typography small>Rename the workspace. The URL updates everywhere.</Typography>
  </CardContent>
  <CardSeparator />
  <CardFooter>
    <Button ghost small>Cancel</Button>
    <Button primary small>Save</Button>
  </CardFooter>
</Card>
```

### Selectable

```tsx
<Card selected onPress={() => {}}>
  <Typography lead semibold>Pro</Typography>
</Card>
```

## Do & Don't

### stat

**Do** — One big number, a short label, a small delta. The metric is scannable in a glance.

```tsx
<Card padded>
  <Row between alignStart>
    <Column tight>
      <Typography caption medium>Active identities</Typography>
      <Typography h3 bold>12,348</Typography>
      <Typography tiny muted>+142 today</Typography>
    </Column>
    <Emblem primary label="U" />
  </Row>
</Card>
```

**Don't** — Prose where the number should be: the eye has nothing big to land on, so the card stops being a stat.

```tsx
<Card padded>
  <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.4, color: tokens["muted-foreground"] }}>This month</Text>
  <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["card-foreground"] }}>We onboarded 12,348 active identities, up 142 today, with churn holding steady.</Text>
</Card>
```

### section

**Do** — Keep the divider between header and body; it anchors the title.

```tsx
<Card flush>
  <CardHeader>
    <CardTitle>Recent activity</CardTitle>
  </CardHeader>
  <CardSeparator />
  <CardContent>
    <Typography small>Two events today.</Typography>
  </CardContent>
</Card>
```

**Don't** — Without the divider the header floats and stops reading as a header.

```tsx
<Card flush>
  <CardHeader>
    <CardTitle>Recent activity</CardTitle>
  </CardHeader>
  <CardContent>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["card-foreground"] }}>Two events today.</Text>
  </CardContent>
</Card>
```

### generic

**Do** — Use the surface once and layout the content with plain spacing inside it.

```tsx
<Card padded>
  <Column tight>
    <Typography lead semibold>Anything goes here</Typography>
    <Typography small muted>The card surface gives you the border, radius, and shadow. You bring the content.</Typography>
  </Column>
</Card>
```

**Don't** — Nesting one card surface inside another stacks border on border and shadow on shadow; the inner block looks dropped in.

```tsx
<Card padded>
  <Card padded>
    <Text style={{ marginBottom: 4, fontSize: 15, fontWeight: "600", color: tokens["card-foreground"] }}>Nested surface</Text>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>A card inside a card doubles the border and shadow.</Text>
  </Card>
</Card>
```
