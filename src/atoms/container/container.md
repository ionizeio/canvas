# Container

The bounds provider. A Canvas component never dictates its own width: it fills
the parent it is given (a field, a card, a table) or hugs its content (a button,
a badge), and the nearest layout container provides the bounds. `Container` is
the layout container whose job is a MEASURE: it spans its parent, caps at one
named step of the shared width scale (`xxxs` 192 through `page` 1280), and centers
itself, so the reading measure of a form, an article, or a card stack is a step
you can name instead of a width invented at the call site. The cap is fluid:
inside anything narrower than the step the container simply fills its parent,
which is all a phone screen is. `fluid` drops the cap, `start` pins the box to
the leading edge instead of centering it, and `padTight` / `pad` / `padLoose`
add horizontal gutters from Row and Column's own padding scale.

## Usage

```tsx
<Container sm>
  <Card padded>
    <Typography medium>Sign in</Typography>
    <Typography small muted>The card fills the container; the container caps at the sm step (384).</Typography>
  </Card>
</Container>
```

## Variants

### Steps

```tsx
<Column snug>
  <Container xs><Card padded><Typography small>xs, 320</Typography></Card></Container>
  <Container md><Card padded><Typography small>md, 448</Typography></Card></Container>
  <Container xl><Card padded><Typography small>xl, 576</Typography></Card></Container>
</Column>
```

### Pinned to the start

```tsx
<Container sm start>
  <Card padded>
    <Typography small>A leading-edge measure for a settings row.</Typography>
  </Card>
</Container>
```

### Fluid with gutters

```tsx
<Container fluid pad>
  <Card padded>
    <Typography small>No cap, 16px gutters on both sides.</Typography>
  </Card>
</Container>
```

## Do & Don't

### Naming a measure

**Do**: Wrap the block in a Container step; the component inside fills it.

```tsx
<Container md>
  <Card padded>
    <Typography medium>Billing</Typography>
    <Typography small muted>Plan, invoices, and payment method.</Typography>
  </Card>
</Container>
```

**Don't**: Pin a width on the component; the number is invented at every call
site and the component stops adapting to the parent it is placed in.

```tsx
<Container md>
  <Card padded>
    <Typography medium>Billing</Typography>
    <Typography small muted>Plan, invoices, and payment method.</Typography>
  </Card>
</Container>
```
