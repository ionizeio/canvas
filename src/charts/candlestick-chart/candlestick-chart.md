# CandlestickChart

The trading instrument view: OHLC candles colored by direction from the success/destructive tokens, an optional docked volume pane, and optional overlay series (moving averages) in the series tokens. Press or scrub a candle to read its Open/High/Low/Close and volume.

## Usage

```tsx
<Container xl>
  <CandlestickChart
  title="OLY · 30 sessions"
  labels={["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21", "D22", "D23", "D24", "D25", "D26", "D27", "D28", "D29", "D30"]}
  candles={[
    { open: 182.0, high: 182.2, low: 179.4, close: 181.6 },
    { open: 181.6, high: 182.4, low: 181.1, close: 181.6 },
    { open: 181.6, high: 181.8, low: 179.0, close: 180.9 },
    { open: 180.9, high: 181.9, low: 180.8, close: 180.9 },
    { open: 180.9, high: 181.9, low: 180.0, close: 180.2 },
    { open: 180.2, high: 182.3, low: 179.2, close: 181.0 },
    { open: 181.0, high: 181.5, low: 179.4, close: 180.2 },
    { open: 180.2, high: 182.5, low: 178.8, close: 181.0 },
    { open: 181.0, high: 182.8, low: 178.9, close: 180.1 },
    { open: 180.1, high: 181.4, low: 179.8, close: 179.9 },
    { open: 179.9, high: 181.1, low: 178.5, close: 180.9 },
    { open: 180.9, high: 181.5, low: 179.4, close: 181.2 },
    { open: 181.2, high: 184.1, low: 179.3, close: 182.6 },
    { open: 182.6, high: 183.7, low: 182.1, close: 182.5 },
    { open: 182.5, high: 183.7, low: 180.1, close: 181.8 },
    { open: 181.8, high: 185.1, low: 181.5, close: 183.2 },
    { open: 183.2, high: 183.6, low: 181.4, close: 183.2 },
    { open: 183.2, high: 183.6, low: 180.8, close: 182.7 },
    { open: 182.7, high: 183.5, low: 180.8, close: 182.9 },
    { open: 182.9, high: 185.1, low: 180.2, close: 182.3 },
    { open: 182.3, high: 183.6, low: 181.1, close: 183.1 },
    { open: 183.1, high: 183.6, low: 183.0, close: 183.4 },
    { open: 183.4, high: 185.5, low: 182.3, close: 184.0 },
    { open: 184.0, high: 185.7, low: 181.4, close: 183.1 },
    { open: 183.1, high: 184.8, low: 182.6, close: 183.8 },
    { open: 183.8, high: 185.8, low: 183.2, close: 184.9 },
    { open: 184.9, high: 185.4, low: 183.0, close: 185.4 },
    { open: 185.4, high: 187.3, low: 182.7, close: 184.5 },
    { open: 184.5, high: 185.9, low: 182.5, close: 184.9 },
    { open: 184.9, high: 185.6, low: 183.4, close: 185.4 }
  ]}
  volume={[20, 55, 56, 48, 45, 55, 40, 36, 57, 55, 52, 24, 55, 32, 31, 54, 54, 40, 20, 34, 23, 29, 31, 43, 31, 28, 27, 29, 29, 51]}
  overlays={[{ label: "5-day average", values: [181.6, 181.6, 181.4, 181.2, 181.0, 180.9, 180.6, 180.7, 180.5, 180.4, 180.4, 180.6, 180.9, 181.4, 181.8, 182.3, 182.7, 182.7, 182.8, 182.9, 182.8, 182.9, 183.1, 183.2, 183.5, 183.8, 184.2, 184.3, 184.7, 185.0] }]}
/>
</Container>
```

## Variants

### Compact sessions

```tsx
<Container md>
  <CandlestickChart
  title="OLY · last 12 sessions"
  compact
  labels={["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"]}
  candles={[
    { open: 64.0, high: 64.3, low: 62.7, close: 63.5 },
    { open: 63.5, high: 64.6, low: 63.2, close: 63.9 },
    { open: 63.9, high: 64.9, low: 62.4, close: 63.6 },
    { open: 63.6, high: 65.2, low: 62.4, close: 64.2 },
    { open: 64.2, high: 64.4, low: 64.0, close: 64.2 },
    { open: 64.2, high: 65.3, low: 62.8, close: 64.4 },
    { open: 64.4, high: 65.4, low: 63.8, close: 64.4 },
    { open: 64.4, high: 64.5, low: 62.6, close: 63.8 },
    { open: 63.8, high: 65.8, low: 63.6, close: 64.7 },
    { open: 64.7, high: 65.1, low: 63.9, close: 64.6 },
    { open: 64.6, high: 66.6, low: 64.3, close: 65.3 },
    { open: 65.3, high: 66.0, low: 64.7, close: 65.1 }
  ]}
/>
</Container>
```

### Dual moving averages

```tsx
<Container xl>
  <CandlestickChart
  title="OLY · 24 sessions"
  labels={["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21", "D22", "D23", "D24"]}
  candles={[
    { open: 96.0, high: 96.1, low: 94.9, close: 95.7 },
    { open: 95.7, high: 96.2, low: 95.4, close: 95.4 },
    { open: 95.4, high: 95.6, low: 94.2, close: 95.4 },
    { open: 95.4, high: 97.5, low: 94.7, close: 96.3 },
    { open: 96.3, high: 97.9, low: 95.5, close: 96.7 },
    { open: 96.7, high: 96.9, low: 94.9, close: 96.2 },
    { open: 96.2, high: 98.2, low: 95.4, close: 97.0 },
    { open: 97.0, high: 97.8, low: 96.2, close: 96.6 },
    { open: 96.6, high: 98.6, low: 96.4, close: 97.4 },
    { open: 97.4, high: 98.8, low: 97.3, close: 98.1 },
    { open: 98.1, high: 98.9, low: 96.3, close: 97.5 },
    { open: 97.5, high: 99.2, low: 97.0, close: 98.2 },
    { open: 98.2, high: 99.5, low: 97.2, close: 98.5 },
    { open: 98.5, high: 100.4, low: 97.9, close: 99.0 },
    { open: 99.0, high: 99.3, low: 97.9, close: 98.5 },
    { open: 98.5, high: 99.6, low: 97.2, close: 98.0 },
    { open: 98.0, high: 99.1, low: 97.7, close: 98.6 },
    { open: 98.6, high: 98.6, low: 98.0, close: 98.4 },
    { open: 98.4, high: 99.6, low: 97.0, close: 98.3 },
    { open: 98.3, high: 99.5, low: 97.1, close: 97.9 },
    { open: 97.9, high: 98.3, low: 97.6, close: 97.8 },
    { open: 97.8, high: 98.8, low: 96.5, close: 98.7 },
    { open: 98.7, high: 99.9, low: 97.7, close: 99.3 },
    { open: 99.3, high: 99.5, low: 98.4, close: 99.1 }
  ]}
  overlays={[
    { label: "7-day average", values: [95.7, 95.6, 95.5, 95.7, 95.9, 96.0, 96.1, 96.2, 96.5, 96.9, 97.1, 97.3, 97.6, 97.9, 98.2, 98.3, 98.3, 98.5, 98.5, 98.4, 98.2, 98.2, 98.4, 98.5] },
    { label: "21-day average", values: [95.7, 95.6, 95.5, 95.7, 95.9, 96.0, 96.1, 96.2, 96.3, 96.5, 96.6, 96.7, 96.8, 97.0, 97.1, 97.2, 97.2, 97.3, 97.4, 97.4, 97.4, 97.5, 97.7, 97.9] }
  ]}
/>
</Container>
```

### Press to inspect

```tsx
<Container xl>
  <CandlestickChart
  title="OLY · 12 sessions"
  labels={["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"]}
  candles={[
    { open: 64.0, high: 64.3, low: 62.7, close: 63.5 },
    { open: 63.5, high: 64.6, low: 63.2, close: 63.9 },
    { open: 63.9, high: 64.9, low: 62.4, close: 63.6 },
    { open: 63.6, high: 65.2, low: 62.4, close: 64.2 },
    { open: 64.2, high: 64.4, low: 64.0, close: 64.2 },
    { open: 64.2, high: 65.3, low: 62.8, close: 64.4 },
    { open: 64.4, high: 65.4, low: 63.8, close: 64.4 },
    { open: 64.4, high: 64.5, low: 62.6, close: 63.8 },
    { open: 63.8, high: 65.8, low: 63.6, close: 64.7 },
    { open: 64.7, high: 65.1, low: 63.9, close: 64.6 },
    { open: 64.6, high: 66.6, low: 64.3, close: 65.3 },
    { open: 65.3, high: 66.0, low: 64.7, close: 65.1 }
  ]}
  volume={[31, 27, 35, 29, 18, 33, 26, 41, 38, 24, 47, 30]}
  defaultSelected={8}
/>
</Container>
```
