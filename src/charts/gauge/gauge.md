# Gauge

A semicircular dial: a 180 degree top arc (muted track plus a tone-colored value arc) for a 0-100 value, the percent readout in the open center of the semicircle, and an optional label below the graphic.

## Usage

```tsx
<Card padded>
  <Column alignCenter>
    <Gauge value={72} label="Uptime" />
  </Column>
</Card>
```

## Variants

### Success tone

```tsx
<Card padded>
  <Column alignCenter>
    <Gauge value={92} success label="Checks passing" />
  </Column>
</Card>
```

### Warning tone

```tsx
<Card padded>
  <Column alignCenter>
    <Gauge value={81} warning label="Budget used" />
  </Column>
</Card>
```

## Do & Don't

### Gauge

**Do** — Put a muted track behind the value arc, the percent readout in the semicircle's open center, and the label below the graphic.

```tsx
<Card padded>
  <Column alignCenter>
    <Gauge value={72} label="Uptime" />
  </Column>
</Card>

```

**Don't** — An arc with no track and no number: there is no baseline to read the fill against and no exact value.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 20, maxWidth: 200, alignItems: "center" }}>
  <View style={{ borderRadius: 9999, borderWidth: 8, borderColor: tokens.primary, height: 120, width: 120 }} />
</View>

```
