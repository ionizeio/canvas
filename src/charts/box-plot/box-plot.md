# BoxPlot

Quartile boxes, whiskers, and outlier dots per category, computed by the chart from raw samples: quartiles by linear interpolation, whiskers at the most extreme data inside the 1.5 IQR fences, outliers beyond them. Scrub a category to flag its five-number summary; each category's summary also folds into the accessible name.

## Usage

```tsx
<Container xl>
  <BoxPlot
  title="Latency by region"
  data={[
    { label: "us-east", values: [42, 38, 51, 44, 47, 39, 58, 44, 41, 49, 96] },
    { label: "eu-west", values: [55, 61, 58, 64, 57, 63, 59, 66, 60, 62] },
    { label: "ap-south", values: [71, 78, 74, 83, 76, 80, 75, 88, 79, 124] },
  ]}
/>
</Container>
```

## Variants

### Compact

```tsx
<Container xl>
  <BoxPlot
  compact
  data={[
    { label: "A", values: [3.1, 3.4, 3.2, 3.8, 3.5, 3.3, 3.9, 3.6] },
    { label: "B", values: [4.2, 4.6, 4.4, 5.1, 4.8, 4.5, 5.4, 4.9] },
  ]}
/>
</Container>
```

### Inspected

```tsx
<Container xl>
  <BoxPlot
  title="Review turnaround"
  defaultSelected={1}
  data={[
    { label: "Mon", values: [2, 4, 3, 5, 4, 3, 6, 4, 3, 5] },
    { label: "Wed", values: [3, 6, 5, 8, 6, 5, 9, 7, 5, 6] },
    { label: "Fri", values: [5, 9, 7, 12, 9, 8, 14, 10, 8, 22] },
  ]}
/>
</Container>
```

## Do & Don't

### BoxPlot

**Do** - Compare distributions with the full five-number anatomy: box, whiskers, median, outliers.

```tsx
<Container xl>
  <BoxPlot
  title="Latency by region"
  data={[
    { label: "us-east", values: [42, 38, 51, 44, 47, 39, 58, 44, 41, 49, 96] },
    { label: "eu-west", values: [55, 61, 58, 64, 57, 63, 59, 66, 60, 62] },
  ]}
/>
</Container>
```

**Don't** - A bar of averages hides the spread and the outliers, which are the point of comparing distributions.

```tsx
<Container xl>
  <Chart
  data={[
    { label: "us-east", value: 46 },
    { label: "eu-west", value: 61 },
  ]}
/>
</Container>
```
