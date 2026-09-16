# Container

The bounds provider. A Canvas component never dictates its own width: it fills
the parent it is given (a field, a card, a table) or hugs its content (a button,
a badge), and the nearest layout container provides the bounds. `Container` is
the layout container whose job is a MEASURE. By default it conforms to its own
parent, full width with no cap, because the parent is the conformance factor. A
named step of the shared width scale (`xxxs` 192 through `page` 1280) caps it and
centers it, so the reading measure of a form, an article, or a card stack is a
step you can name instead of a width invented at the call site. A cap is fluid:
inside anything narrower than the step the container simply fills its parent,
which is all a phone screen is. `start` pins a capped box to the leading edge
instead of centering it, and `padTight` / `pad` / `padLoose` add horizontal
gutters from Row and Column's own padding scale.

## Usage

```tsx
<Container sm>
  <Card>
    <Typography medium>Sign in</Typography>
  </Card>
</Container>
```

## Variants

### Steps

```tsx
<Column>
  <Container xs><Card><Typography small>xs, 320</Typography></Card></Container>
  <Container md><Card><Typography small>md, 448</Typography></Card></Container>
  <Container xl><Card><Typography small>xl, 576</Typography></Card></Container>
</Column>
```

### Pinned to the start

```tsx
<Container sm start>
  <Card>
    <Typography small>Settings</Typography>
  </Card>
</Container>
```

### Full width with gutters

```tsx
<Container pad>
  <Card padded>
    <Typography small>The default measure is the parent's own width; pad adds 16px gutters on both sides.</Typography>
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
