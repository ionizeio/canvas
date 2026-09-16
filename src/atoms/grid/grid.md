# Grid

The container-measured auto-fit tile grid. `minTileWidth` sets the floor
(default 240): the grid fits as many equal-width columns of at least that width
as its own measured container allows, and re-fits as the container changes, so
the same grid renders three-up on a desktop, two-up on a tablet, and a single
column on a phone with no breakpoint at the call site. `columns` caps the count
at the desktop number, the gap scale is Row and Column's own
(`flush` / `tight` / `snug` / `cozy` / `relaxed` / `loose`), and a `GridItem`
child with `wide` spans two cells. The grid spans its parent's full width (it is
a FILL component, so it needs no wrapper to reach the edges), and its tiles are
equal-height as well as equal-width: every cell stretches to the height of the
row it wrapped onto, and a `Card` in a cell grows to fill it, so a row of cards
shares a flush bottom edge however unevenly their content runs (CSS Grid's
`align-items: stretch`). A field or a hug component keeps its own height.
Equal-width tiles belong here; content-sized rows that should stack at narrow
widths belong to `Row stacks`.

## Usage

```tsx
<Grid minTileWidth={220}>
  <Card padded>
    <Typography medium>Overview</Typography>
    <Typography small muted>Traffic is up 12% this week.</Typography>
  </Card>
  <Card padded>
    <Typography medium>Deploys</Typography>
    <Typography small muted>14 releases shipped to production.</Typography>
  </Card>
  <Card padded>
    <Typography medium>Alerts</Typography>
    <Typography small muted>2 open, both acknowledged.</Typography>
  </Card>
</Grid>
```

## Variants

### Capped columns

```tsx
<Grid minTileWidth={200} columns={2}>
  <Card padded>
    <Typography medium>Production</Typography>
    <Typography small muted>All systems normal.</Typography>
  </Card>
  <Card padded>
    <Typography medium>Staging</Typography>
    <Typography small muted>Deploy in progress.</Typography>
  </Card>
  <Card padded>
    <Typography medium>Preview</Typography>
    <Typography small muted>Idle.</Typography>
  </Card>
  <Card padded>
    <Typography medium>Development</Typography>
    <Typography small muted>3 branches active.</Typography>
  </Card>
</Grid>
```

### Wide tile

```tsx
<Grid minTileWidth={200} columns={3}>
  <GridItem wide>
    <Card padded>
      <Typography medium>Latency</Typography>
      <Typography small muted>The hero tile spans two cells.</Typography>
    </Card>
  </GridItem>
  <Card padded>
    <Typography medium>Errors</Typography>
    <Typography small muted>0.02%</Typography>
  </Card>
  <Card padded>
    <Typography medium>Throughput</Typography>
    <Typography small muted>1.2k rps</Typography>
  </Card>
  <Card padded>
    <Typography medium>Saturation</Typography>
    <Typography small muted>41%</Typography>
  </Card>
</Grid>
```

### Equal heights

Uneven content, one bottom edge: each card fills the height of its row.

```tsx
<Grid minTileWidth={200} columns={3}>
  <Card padded>
    <Typography medium>Uptime</Typography>
    <Typography small muted>99.98% over the last 30 days.</Typography>
  </Card>
  <Card padded>
    <Typography medium>Incidents</Typography>
    <Typography small muted>
      One partial outage on the EU edge, resolved in 14 minutes; a postmortem is
      scheduled for Thursday.
    </Typography>
  </Card>
  <Card padded>
    <Typography medium>On call</Typography>
    <Typography small muted>Priya, until 09:00.</Typography>
  </Card>
</Grid>
```

### Tight gap

```tsx
<Grid minTileWidth={160} tight>
  <Card padded>
    <Typography small>CPU</Typography>
  </Card>
  <Card padded>
    <Typography small>Memory</Typography>
  </Card>
  <Card padded>
    <Typography small>Disk</Typography>
  </Card>
  <Card padded>
    <Typography small>Network</Typography>
  </Card>
</Grid>
```

## Do & Don't

### Column math

**Do** — Give the grid a tile floor (and optionally a desktop cap) and let it
fit its container.

```tsx
<Grid minTileWidth={220} columns={3}>
  <Card padded>
    <Typography medium>Overview</Typography>
  </Card>
  <Card padded>
    <Typography medium>Deploys</Typography>
  </Card>
  <Card padded>
    <Typography medium>Alerts</Typography>
  </Card>
</Grid>
```

**Don't** — Hand-roll percent tile widths on a wrapping Row; the column count
is then frozen at the call site and every consumer re-derives the phone
collapse by hand.

```tsx
<Row wrap snug>
  <View style={{ width: "31%" }}>
    <Card padded>
      <Typography medium>Overview</Typography>
    </Card>
  </View>
  <View style={{ width: "31%" }}>
    <Card padded>
      <Typography medium>Deploys</Typography>
    </Card>
  </View>
  <View style={{ width: "31%" }}>
    <Card padded>
      <Typography medium>Alerts</Typography>
    </Card>
  </View>
</Row>
```
