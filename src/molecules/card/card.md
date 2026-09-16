# Card

Three families. `StatCard` = a single metric, big number + delta. `SectionCard` = a labeled content surface with optional header and divider. Generic `card` = bring your own structure. A card with content is padded by default, and a padded surface also spaces its flat children (the card owns the vertical rhythm, so a stack of Typography lines needs no layout wrapper); pass `flush` to opt out of both, the inset and the spacing, for edge-to-edge content (a table, a nav bar) or when you compose the self-padding `CardHeader`/`CardContent`. The section props (`title` / `description` / `icon` / `actions` / `footer`) render self-padding sections, so a sectioned card needs no `padded`. They compose with a string `body` OR with raw children, so a panel can carry a titled header above a table or a form; children win when both are passed. For a cover image, `CardMedia` is the full-bleed top slot: it spans the card edge to edge, its top corners follow the card's corner, and its bottom edge stays flat; compose it with `flush` and let `CardContent` pad the text below. Density: pass `compact` or `comfortable` to tighten or relax the card's own padding and the gap between flat children (`compact` takes precedence, and a density prop pads the surface on its own). `grow` fills the height a parent Row or Column hands the card (the body takes the slack, so a footer stays on its floor); inside a `Grid` cell it is implied, so the tiles of one row are equal-height without being asked.

## Usage

```tsx
<Container xxs>
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
</Container>
```

## Variants

### Section

```tsx
<Card
  onPress={() => {}}
  title="Recent activity"
  body="A labeled content surface. Drop fields, a list, or any module of content here."
/>
```

### Section with children

```tsx
<Card title="Identity" description="Core attributes" actions={<Button ghost small>Edit</Button>}>
  <DescriptionList
    items={[
      { term: "ID", value: "6f1c2a", mono: true },
      { term: "State", value: "Active", status: true },
    ]}
  />
</Card>
```

### Generic

```tsx
<Container sm>
  <Card>
    <Column tight>
      <Typography lead semibold>Anything goes here</Typography>
      <Typography small muted>The card surface gives you the border, radius, and shadow. You bring the content.</Typography>
    </Column>
  </Card>
</Container>
```

### Flat children

```tsx
<Container sm>
  <Card>
    <Typography lead semibold>The surface owns the rhythm</Typography>
    <Typography small muted>A padded card spaces its flat children by itself: each line lands a steady step below the last.</Typography>
    <Typography small muted>Three flat Typography children, no layout wrapper between them.</Typography>
  </Card>
</Container>
```

### Media

```tsx
<Container xs>
  <Card flush>
    <CardMedia src="/kira-tanaka.jpg" height={180} alt="Portrait of Kira Tanaka" />
    <CardContent>
      <Column cozy>
        <Column tight>
          <Typography h5 semibold>Kira Tanaka</Typography>
          <Typography small muted>Design engineer. Ships the pixels and the pipeline that delivers them.</Typography>
        </Column>
        <Row snug>
          <Button primary small>Follow</Button>
          <Button outline small>Message</Button>
        </Row>
      </Column>
    </CardContent>
  </Card>
</Container>
```

### Horizontal

```tsx
<Container sm>
  <Card>
    <MediaObject
      src="/rachel-chen.jpg"
      title="Rachel Chen"
      description="Platform engineering, San Francisco"
      action={<Button outline small>View</Button>}
      center
    />
  </Card>
</Container>
```

### Actions

```tsx
<Container sm>
  <Card flush>
    <CardHeader>
      <CardTitle>Workspace settings</CardTitle>
      <CardDescription>Rename the workspace. The URL updates everywhere.</CardDescription>
    </CardHeader>
    <CardSeparator />
    <CardContent>
      <Input label="Workspace name" placeholder="Acme Inc." />
    </CardContent>
    <CardSeparator />
    <CardFooter>
      <Button ghost small>Cancel</Button>
      <Button primary small>Save changes</Button>
    </CardFooter>
  </Card>
</Container>
```

### Selectable

```tsx
<Stateful initial="pro">
  {(plan, setPlan) => (
    <Container sm>
      <Row cozy>
        <Column fill>
          <Card grow selected={plan === "starter"} onPress={() => setPlan("starter")}>
            <Column tight>
              <Typography lead semibold>Starter</Typography>
              <Typography small muted>3 projects, 1 seat</Typography>
            </Column>
          </Card>
        </Column>
        <Column fill>
          <Card grow selected={plan === "pro"} onPress={() => setPlan("pro")}>
            <Column tight>
              <Typography lead semibold>Pro</Typography>
              <Typography small muted>Unlimited, 10 seats</Typography>
            </Column>
          </Card>
        </Column>
      </Row>
    </Container>
  )}
</Stateful>
```

### Flat

```tsx
<Container sm>
  <Card flat>
    <Column tight>
      <Typography lead semibold>Outlined and quiet</Typography>
      <Typography small muted>Flat drops the shadow so the card sits flush with the page. On Android this is the Material outlined card.</Typography>
    </Column>
  </Card>
</Container>
```

### Raised

```tsx
<Container sm>
  <Card raised>
    <Column tight>
      <Typography lead semibold>Lifted above the page</Typography>
      <Typography small muted>Raised deepens the shadow for the moments a card needs emphasis: a drag preview, a featured module.</Typography>
    </Column>
  </Card>
</Container>
```

### Icon and footer

```tsx
<Container sm>
  <Card
  title="Identity"
  icon={<Icon user muted size={16} />}
  description="Core attributes"
  body="Name, primary email, and sign-in methods for this account."
  footer="Updated 2 minutes ago"
/>
</Container>
```

### Density

```tsx
<Container lg>
  <Row cozy>
    <Column fill>
      <Card compact grow>
        <Typography lead semibold>Compact</Typography>
        <Typography small muted>Tight padding and rhythm for dense dashboards.</Typography>
      </Card>
    </Column>
    <Column fill>
      <Card comfortable grow>
        <Typography lead semibold>Comfortable</Typography>
        <Typography small muted>Roomy padding and rhythm for relaxed reading.</Typography>
      </Card>
    </Column>
  </Row>
</Container>
```

## Do & Don't

### stat

**Do** — One big number, a short label, a small delta. The metric is scannable in a glance.

```tsx
<Container xxs>
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
</Container>
```

**Don't** — Prose where the number should be: the eye has nothing big to land on, so the card stops being a stat.

```tsx
<Container xxs>
  <Card padded>
    <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.4, color: tokens["muted-foreground"] }}>This month</Text>
    <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, fontWeight: "500", color: tokens["card-foreground"] }}>We onboarded 12,348 active identities, up 142 today, with churn holding steady.</Text>
  </Card>
</Container>
```

### section

**Do** — Keep the divider between header and body; it anchors the title.

```tsx
<Container sm>
  <Card flush>
    <CardHeader>
      <CardTitle>Recent activity</CardTitle>
    </CardHeader>
    <CardSeparator />
    <CardContent>
      <Typography small>Two events today.</Typography>
    </CardContent>
  </Card>
</Container>
```

**Don't** — Without the divider the header floats and stops reading as a header.

```tsx
<Container sm>
  <Card flush>
    <CardHeader>
      <CardTitle>Recent activity</CardTitle>
    </CardHeader>
    <CardContent>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["card-foreground"] }}>Two events today.</Text>
    </CardContent>
  </Card>
</Container>
```

### generic

**Do** — Use the surface once and layout the content with plain spacing inside it.

```tsx
<Container sm>
  <Card padded>
    <Column tight>
      <Typography lead semibold>Anything goes here</Typography>
      <Typography small muted>The card surface gives you the border, radius, and shadow. You bring the content.</Typography>
    </Column>
  </Card>
</Container>
```

**Don't** — Nesting one card surface inside another stacks border on border and shadow on shadow; the inner block looks dropped in.

```tsx
<Container sm>
  <Card padded>
    <Card padded>
      <Text style={{ marginBottom: 4, fontSize: 15, fontWeight: "600", color: tokens["card-foreground"] }}>Nested surface</Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>A card inside a card doubles the border and shadow.</Text>
    </Card>
  </Card>
</Container>
```
