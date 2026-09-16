# CandlestickChart

The trading instrument view: OHLC candles colored by direction from the success/destructive tokens, an optional docked volume pane, and optional overlay series (moving averages) in the series tokens. Press or scrub a candle to read its Open/High/Low/Close and volume.

## Usage

```tsx
<CandlestickChart
  title="OLY"
  labels={["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]}
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
    { open: 64.7, high: 65.1, low: 63.9, close: 64.6 }
  ]}
  volume={[31, 27, 35, 29, 18, 33, 26, 41, 38, 24]}
/>
```

## Variants

### Compact sessions

```tsx
<CandlestickChart
  compact
  labels={["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]}
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
    { open: 64.7, high: 65.1, low: 63.9, close: 64.6 }
  ]}
/>
```

### Dual moving averages

```tsx
<CandlestickChart
  labels={["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]}
  candles={[
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
    { label: "7-day average", values: [98.2, 98.3, 98.3, 98.5, 98.5, 98.4, 98.2, 98.2, 98.4, 98.5] },
    { label: "21-day average", values: [97.1, 97.2, 97.2, 97.3, 97.4, 97.4, 97.4, 97.5, 97.7, 97.9] }
  ]}
/>
```

### Press to inspect

```tsx
<CandlestickChart
  defaultSelected={5}
  labels={["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"]}
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
    { open: 64.7, high: 65.1, low: 63.9, close: 64.6 }
  ]}
/>
```
