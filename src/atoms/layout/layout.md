# Row & Column

The layout primitives. `Row` lays children out horizontally, `Column`
vertically. Both own arrangement through semantic boolean axes, a gap scale
(`flush` / `tight` / `snug` / `cozy` / `relaxed` / `loose`), main-axis
distribution (`center`, `between`, …), cross-axis alignment (`alignCenter`,
`baseline`, …), and `wrap` / `fill` / `grow` / `shrink`, so a call site never
hand-rolls `flexDirection`, `gap`, or `alignItems`.

## Usage

```tsx
<Row>
  <Button primary>Save</Button>
  <Button ghost>Cancel</Button>
</Row>
```

## Variants

### Vertical stack

```tsx
<Column>
  <Button primary>Save</Button>
  <Button ghost>Cancel</Button>
</Column>
```

### Centered row

```tsx
<Row center>
  <Badge>schema</Badge>
  <Badge>role</Badge>
</Row>
```

### Space between

```tsx
<Row between>
  <Typography small>Request ID</Typography>
  <Typography mono>req_8f2c10ab</Typography>
</Row>
```

### Wrap

```tsx
<Row wrap>
  <Badge>alpha</Badge>
  <Badge>beta</Badge>
  <Badge>gamma</Badge>
  <Badge>delta</Badge>
  <Badge>epsilon</Badge>
  <Badge>zeta</Badge>
</Row>
```

### Shrink a child to the row

React Native gives every box `flexShrink: 0`, the opposite of the web's flex
default, so a Row child sized by a long sentence keeps that sentence's full
single-line width and spills past the row's edge, where the nearest clipping
ancestor cuts it mid-word. `shrink` hands the row's width back to the text: the
child gives way and the copy wraps. Reach for it on the copy in a
heading-beside-actions row, or any Row child whose width should follow the row
rather than its own longest line. It is not `fill`: `fill` also zeroes the flex
basis, so in a `wrap` row every child then fits on one line and the actions stop
wrapping below the copy.

```tsx
<Row between alignEnd wrap>
  <Column tight shrink>
    <Typography h3>Dashboard</Typography>
    <Typography small muted>Identity platform overview. Each widget reports its own window.</Typography>
  </Column>
  <Button outline small>Export</Button>
</Row>
```

### Padded surround

```tsx
<Card flush>
  <Row pad>
    <Typography>Padded surround</Typography>
  </Row>
</Card>
```

### Stacks at narrow widths

`stacks` renders the Row as a Column when the row's own container is at or
below `stackBreakpoint` (default `sm` = 640): container-measured, so it stacks
inside a narrow desktop column too, and the same gap, distribution, alignment,
and padding props apply to the new axes. Children keep their own sizing, which
makes `stacks` the tool for content-sized rows (a toolbar, a label beside its
actions); equal-width tiles that should renumber columns belong to `Grid`. A
Column never needs the inverse: a Column that must become a Row is a Row that
stacks.

```tsx
<Row stacks>
  <Input placeholder="Search runs" />
  <Button primary>New run</Button>
</Row>
```

### Spans (twelfths of the Row)

A direct child's `span` is its width in twelfths of the Row, Bootstrap's
`col-n`: `span={6}` is half, `span={4}` a third, `span={8}` two thirds. The Row
measures its own width and hands each spanning child a px cell with the gaps
accounted for, so two `span={6}` children and the gap between them fill the row
exactly, and spans past twelve wrap onto the next line. Fill components inside a
span (a field, a card) fill the cell.

```tsx
<Row>
  <Column span={8}>
    <Card>
      <Typography medium>Eight of twelve</Typography>
    </Card>
  </Column>
  <Column span={4}>
    <Card>
      <Typography medium>Four</Typography>
    </Card>
  </Column>
</Row>
```

### Spans that stack

`stacks` and spans compose: below the breakpoint the Row becomes a Column and
every child is full width, the `col-12 col-md-6` idiom without a second prop.

```tsx
<Row stacks>
  <Column span={6}>
    <Card>
      <Typography medium>Left</Typography>
    </Card>
  </Column>
  <Column span={6}>
    <Card>
      <Typography medium>Right</Typography>
    </Card>
  </Column>
</Row>
```

## Do & Don't

### Gap

**Do** — Use the gap scale so spacing tracks the kit's spacing tokens.

```tsx
<Row alignCenter snug>
  <Button primary>Save</Button>
  <Button ghost>Cancel</Button>
</Row>
```

**Don't** — Hand-roll `flexDirection` and a raw `gap`; that is a styling escape hatch.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
  <Button primary>Save</Button>
  <Button ghost>Cancel</Button>
</View>
```

### Alignment

**Do** — Reach for the main- and cross-axis booleans (`between`, `alignCenter`).

```tsx
<Row between alignCenter>
  <Typography small>Total</Typography>
  <Typography h5>$1,240.00</Typography>
</Row>
```

**Don't** — Push content around with raw `justifyContent` and `marginLeft`.

```tsx
<View style={{ flexDirection: "row" }}>
  <Text style={{ fontSize: 14, color: "#71717a" }}>Total</Text>
  <Text style={{ marginLeft: "auto", fontWeight: "600" }}>$1,240.00</Text>
</View>
```

### Overflow

**Do** — Mark the child that may give way with `shrink`, so its text wraps to the row.

```tsx
<Row between alignEnd wrap snug>
  <Column tight shrink>
    <Typography h5>Sessions</Typography>
    <Typography small muted>Every session Kratos is holding open, newest first.</Typography>
  </Column>
  <Button primary small>Revoke all</Button>
</Row>
```

**Don't** — Reach into the raw view to unstick it; that is a styling escape hatch.

```tsx
<View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
  <View style={{ flexShrink: 1, minWidth: 0 }}>
    <Text style={{ fontSize: 16, fontWeight: "600" }}>Sessions</Text>
    <Text style={{ fontSize: 13, color: "#71717a" }}>Every session Kratos is holding open, newest first.</Text>
  </View>
  <Button primary small>Revoke all</Button>
</View>
```
