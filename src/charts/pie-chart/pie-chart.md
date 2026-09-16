# PieChart

Proportional composition as arc slices in the `chart-1`..`chart-8` token colors, with a percent legend. `donut` centers the total (or the selected slice while inspecting); pressing a slice dims the others.

## Usage

```tsx
<Card padded>
  <PieChart
    donut
    label="Traffic"
    slices={[
      { label: "Direct", value: 38 },
      { label: "Organic search", value: 24 },
      { label: "Social", value: 15 },
      { label: "Referral", value: 11 },
      { label: "Email", value: 8 },
      { label: "Paid", value: 4 }
    ]}
  />
</Card>
```

## Do & Don't

### Pie

**Do** — Keep slices to a handful and fold the tail into an "Other" slice; the legend carries exact shares.

```tsx
<Card padded>
  <PieChart
    label="Traffic"
    slices={[
      { label: "Direct", value: 42 },
      { label: "Organic search", value: 28 },
      { label: "Social", value: 18 },
      { label: "Other", value: 12 }
    ]}
  />
</Card>

```

**Don't** — A dozen sliver slices cycle the palette and become unreadable; nothing is comparable at a glance.

```tsx
<Card padded>
  <PieChart
    label="Traffic"
    slices={[
      { label: "Direct", value: 22 },
      { label: "Organic", value: 18 },
      { label: "Social", value: 11 },
      { label: "Referral", value: 9 },
      { label: "Email", value: 8 },
      { label: "Paid", value: 7 },
      { label: "Video", value: 6 },
      { label: "Affiliates", value: 6 },
      { label: "Push", value: 5 },
      { label: "SMS", value: 4 },
      { label: "Podcasts", value: 2 },
      { label: "Misc", value: 2 }
    ]}
  />
</Card>

```
