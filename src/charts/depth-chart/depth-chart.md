# DepthChart

The order-book view: cumulative bid and ask step areas mirrored around the spread, bids in the success tone and asks in destructive, on a numeric price axis.

## Usage

```tsx
<DepthChart
title="OLY order book"
bids={[
  { price: 191.3, size: 80 },
  { price: 191.15, size: 120 },
  { price: 191.0, size: 116 },
  { price: 190.85, size: 118 },
  { price: 190.7, size: 176 },
  { price: 190.55, size: 190 },
  { price: 190.4, size: 210 },
  { price: 190.25, size: 236 },
  { price: 190.1, size: 318 },
  { price: 189.95, size: 356 },
  { price: 189.8, size: 400 },
  { price: 189.65, size: 450 },
  { price: 189.5, size: 556 },
  { price: 189.35, size: 618 }
]}
asks={[
  { price: 191.6, size: 90 },
  { price: 191.75, size: 122 },
  { price: 191.9, size: 110 },
  { price: 192.05, size: 154 },
  { price: 192.2, size: 154 },
  { price: 192.35, size: 210 },
  { price: 192.5, size: 222 },
  { price: 192.65, size: 240 },
  { price: 192.8, size: 314 },
  { price: 192.95, size: 344 },
  { price: 193.1, size: 430 },
  { price: 193.25, size: 472 },
  { price: 193.4, size: 570 },
  { price: 193.55, size: 624 }
]}
/>
```

## Variants

### Thin book

```tsx
<DepthChart
title="OLY · thin book"
compact
hideAxes
bids={[
  { price: 191.3, size: 90 },
  { price: 191.15, size: 150 },
  { price: 191.0, size: 220 },
  { price: 190.85, size: 310 },
  { price: 190.7, size: 420 }
]}
asks={[
  { price: 191.6, size: 110 },
  { price: 191.75, size: 180 },
  { price: 191.9, size: 260 },
  { price: 192.05, size: 350 },
  { price: 192.2, size: 470 }
]}
/>
```
