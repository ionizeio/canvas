# MetricBreakdown

The decomposed-metric dashboard card: a preformatted headline `value` with its caption, an optional secondary `rate` readout top right (toned by `rateSuccess`, `rateWarning`, or `rateDestructive`), an optional trend strip drawn by the kit Sparkline with a floating latest-value tag, per-category `breakdown` rows with proportional share bars and Stats-style deltas, and a `chips` footer for recent notable codes. Every section is independently optional, so one layout backs OAuth token issuance, API request volume, sign-up sources, and any metric that needs decomposition plus trend in one card.

## Usage

```tsx
<MetricBreakdown
value="3,771"
label="Tokens issued"
rate="1.39%"
rateLabel="Error rate"
rateDestructive
spark={[96, 104, 101, 110, 108, 112, 116, 114, 118, 116]}
sparkUnit="req/s"
breakdown={[
  { label: "authorization_code", value: 1842, delta: "+12%" },
  { label: "refresh_token", value: 1264, delta: "+4%" },
  { label: "client_credentials", value: 618, delta: "-3%", down: true },
  { label: "password (legacy)", value: 47, delta: "-22%", down: true },
]}
chipsLabel="Errors"
chips={[
  { label: "invalid_grant", count: 38, destructive: true },
  { label: "invalid_client", count: 11, destructive: true },
  { label: "unauthorized_client", count: 4, destructive: true },
]}
/>
```

## Variants

### Minimal

```tsx
<MetricBreakdown
value="960"
label="New sign-ups today"
breakdown={[
  { label: "google", value: 412, delta: "+18%" },
  { label: "email", value: 318, delta: "+3%" },
  { label: "github", value: 142, delta: "-6%", down: true },
  { label: "passkey", value: 88, delta: "+41%" },
]}
/>
```

### Rate and trend

```tsx
<MetricBreakdown
value="25,874"
label="Requests"
rate="0.74%"
rateLabel="4xx + 5xx rate"
rateSuccess
spark={[180, 196, 188, 204, 210, 202, 214, 220, 208, 216]}
sparkUnit="req/s"
/>
```

### Plain, inside a card

```tsx
<Card padded>
  <MetricBreakdown
    plain
    compact
    value="25,874"
    label="Requests"
    breakdown={[
      { label: "GET", value: 18248, delta: "+8%" },
      { label: "POST", value: 6104, delta: "+21%" },
      { label: "PATCH", value: 1212, delta: "-2%", down: true },
    ]}
    chipsLabel="Top codes"
    chips={[
      { label: "404", count: 142, warning: true },
      { label: "429", count: 38, warning: true },
      { label: "500", count: 7, destructive: true },
    ]}
  />
</Card>
```

## Do & Don't

### MetricBreakdown

**Do** - Pass preformatted strings and semantic tone booleans; the card owns the header, trend, rows, and chip anatomy.

```tsx
<MetricBreakdown
value="12.4k"
label="Requests"
rate="0.74%"
rateLabel="Error rate"
rateSuccess
breakdown={[
  { label: "GET", value: 8, delta: "+8%" },
  { label: "POST", value: 4, delta: "+21%" },
]}
/>
```

**Don't** - Rebuilding the header and trend from Text and Sparkline at the call site splits the anatomy the card owns and loses the rows' accessible shares.

```tsx
<View style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card, padding: 20, maxWidth: 420, gap: 8 }}>
  <Text style={{ fontSize: 22, fontWeight: "600" }}>12.4k</Text>
  <Text style={{ fontSize: 11, color: tokens["muted-foreground"] }}>REQUESTS</Text>
  <Sparkline line values={[96, 104, 110, 108, 116]} />
</View>
```
