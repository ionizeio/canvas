# ProgressRing

A full-circle completion ring, the Gauge's sibling: a muted track ring, a tone-colored value arc revealed clockwise from 12 o'clock with rounded caps, the whole-percent readout centered inside, and an optional label below the graphic. The same 0-100 value contract, tone axis, and rounding rules as Gauge, in the circular anatomy that reads as "completion" rather than "level".

## Usage

```tsx
<Container xxxs>
  <Card padded>
    <Column alignCenter>
      <ProgressRing value={72} label="Complete" />
    </Column>
  </Card>
</Container>
```

## Variants

### Success tone

```tsx
<Container xxxs>
  <Card padded>
    <Column alignCenter>
      <ProgressRing value={92} success label="Tests passing" />
    </Column>
  </Card>
</Container>
```

### Warning tone, compact

```tsx
<Container xxxs>
  <Card padded>
    <Column alignCenter>
      <ProgressRing value={81} warning compact label="Budget used" />
    </Column>
  </Card>
</Container>
```

## Do & Don't

### ProgressRing

**Do** - Put a muted track behind the value arc, the percent readout in the ring's center, and the label below the graphic.

```tsx
<Container xxxs>
  <Card padded>
    <Column alignCenter>
      <ProgressRing value={72} label="Complete" />
    </Column>
  </Card>
</Container>
```

**Don't** - A bordered circle with no track and no readout gives no baseline to read the fill against and no exact value.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 20, maxWidth: 200, alignItems: "center" }}>
  <View style={{ borderRadius: 9999, borderWidth: 10, borderColor: tokens.primary, height: 120, width: 120 }} />
</View>
```
