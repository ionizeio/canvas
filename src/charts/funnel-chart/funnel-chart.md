# FunnelChart

Stage-by-stage conversion: a column of centered trapezoids, each stage's top width proportional to its value and tapering to the next stage's width (the last stage is rectangular), ramp-colored, with the stage's label, value, and conversion percent as text on the stage. The percent reads against the previous stage by default; `share` reads every stage against the first. Press a stage to select it (the others dim).

## Usage

```tsx
<Container lg>
  <FunnelChart
  title="Signup funnel"
  stages={[
    { label: "Visits", value: 12400 },
    { label: "Signups", value: 4200 },
    { label: "Activated", value: 1850 },
    { label: "Paid", value: 480 },
  ]}
/>
</Container>
```

## Variants

### Share of the first stage

```tsx
<Container lg>
  <FunnelChart
  title="Checkout"
  share
  stages={[
    { label: "Cart", value: 8600 },
    { label: "Address", value: 5200 },
    { label: "Payment", value: 3900 },
    { label: "Placed", value: 3400 },
  ]}
/>
</Container>
```

### Compact, inspected

```tsx
<Container lg>
  <FunnelChart
  compact
  defaultSelected={1}
  stages={[
    { label: "Leads", value: 900 },
    { label: "Qualified", value: 340 },
    { label: "Closed", value: 120 },
  ]}
/>
</Container>
```

## Do & Don't

### FunnelChart

**Do** - Order the stages widest first and let the taper carry the drop-off.

```tsx
<Container lg>
  <FunnelChart
  title="Signup funnel"
  stages={[
    { label: "Visits", value: 12400 },
    { label: "Signups", value: 4200 },
    { label: "Paid", value: 480 },
  ]}
/>
</Container>
```

**Don't** - A funnel that widens mid-way is not a funnel; a stage exceeding its predecessor warns and reads as an error.

```tsx
<Container lg>
  <FunnelChart
  stages={[
    { label: "Visits", value: 4200 },
    { label: "Signups", value: 12400 },
  ]}
/>
</Container>
```
