# Stepper

Increment, decrement, or type a number in a bounded range. A − button, an editable numeric center field, and a + button, controlled by `value` and clamped to `min` / `max` by `step`. This is the ± numeric control (the iOS UIStepper idiom); for a multi-step progress indicator see Steps.

## Usage

```tsx
<Stepper defaultValue={3} max={10} />
```

## Variants

### With label

```tsx
<Stepper label="Quantity" defaultValue={1} min={1} max={9} />
```

### With description

```tsx
<Stepper label="Quantity" description="Up to 10 per order." defaultValue={1} min={1} max={10} />
```

### Sizes

```tsx
<Row alignCenter relaxed>
  <Stepper small defaultValue={2} max={10} />
  <Stepper defaultValue={2} max={10} />
  <Stepper large defaultValue={2} max={10} />
</Row>
```

### With min / max

```tsx
<Row alignCenter relaxed>
  <Stepper defaultValue={0} min={0} max={5} />
  <Stepper defaultValue={5} min={0} max={5} />
</Row>
```

### Stepped

```tsx
<Stepper defaultValue={20} max={100} step={10} />
```

### Disabled

```tsx
<Stepper disabled defaultValue={4} max={10} />
```

## Do & Don't

### Bounds

**Do** — Set `min` and `max` so the buttons disable at the edges and the value can never leave the valid range.

```tsx
<Stepper label="Quantity" defaultValue={1} min={1} max={9} onChange={() => {}} />
```

**Don't** — Leaving the range unbounded lets the user push the count below zero or past what the form can accept.

```tsx
<Stepper defaultValue={1} onChange={() => {}} />
```

### Step

**Do** — Match `step` to the real increment, so each tap moves the value by an amount that makes sense for the field.

```tsx
<Stepper defaultValue={30} min={0} max={120} step={5} onChange={() => {}} />
```

**Don't** — A step of 1 on a field that only takes round numbers makes the user tap many times to reach a usable value.

```tsx
<Stepper defaultValue={30} min={0} max={120} step={1} onChange={() => {}} />
```
