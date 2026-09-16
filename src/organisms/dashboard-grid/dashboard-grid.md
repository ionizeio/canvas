# DashboardGrid

A 12-column widget board for overview screens. Each widget declares a span in twelfths, and the grid measures its OWN width (never the window) to pick a tier: a wide container honors every span, a narrower one reflows widgets to their `narrowSpan`, and a phone-sized one stacks them full width. Cells render bare, because a widget arrives with its own surface (a Card, a Chart, a Stats row) and a second frame around it would only double up. A widget's `title` is its accessible name rather than a header the grid paints: customize mode uses it to name the widget's drag grip and its drop zone. Locked, it is a plain static grid and no drag machinery is mounted at all; `unlocked` turns on customize mode, where every cell gains a grip and the board reorders by pointer, keyboard, or screen reader through the kit's own drag-and-drop. The order is a plain array of ids, controlled through `order` and `onOrderChange` so the app can persist it, or left to the grid with `defaultOrder`. The board takes its widgets through `items`, the collection prop every other collection-taking component in the kit uses; the original `widgets` spelling still works as a deprecated alias and warns in development.

## Usage

```tsx
<DashboardGrid
  items={[
    { id: "revenue", span: 8, title: "Revenue", content: <Chart title="Revenue" data={[{ label: "Mon", value: 12 }, { label: "Tue", value: 18 }, { label: "Wed", value: 15 }, { label: "Thu", value: 22 }]} /> },
    { id: "signups", span: 4, title: "Signups", content: <BarList title="Signups" items={[{ label: "Web", value: 82 }, { label: "iOS", value: 64 }]} /> },
    { id: "endpoints", span: 12, title: "Slowest endpoints", content: <BarList title="Slowest endpoints" items={[{ label: "/api/search", value: 240 }, { label: "/api/feed", value: 180 }]} /> },
  ]}
/>
```

## Variants

### Customize mode

`unlocked` is the app's switch, never the grid's: turning it on paints the cell affordance, shows a grip on every widget, and makes the board reorderable. The grips stay visible for as long as the mode lasts, because React Native has no portable hover event and an edit mode already announces itself. `defaultOrder` hands the order to the grid, which applies each drop itself and reports the result through `onOrderChange`, so a bare board is interactive out of the box.

```tsx
<DashboardGrid
  unlocked
  items={[
    { id: "revenue", span: 6, title: "Revenue", content: <Chart title="Revenue" data={[{ label: "Mon", value: 12 }, { label: "Tue", value: 18 }]} /> },
    { id: "signups", span: 6, title: "Signups", content: <BarList title="Signups" items={[{ label: "Web", value: 82 }, { label: "iOS", value: 64 }]} /> },
  ]}
/>
```

### Controlled order

The primary path: the app owns the id array and persists it through its own API, applying every `onOrderChange`. Ids the widget list no longer holds are ignored and widgets missing from the order are appended, so a layout saved before a release keeps working.

```tsx
<Stateful initial={["signups", "revenue"]}>
  {(order, setOrder) => (
    <DashboardGrid
      unlocked
      order={order}
      onOrderChange={setOrder}
      items={[
        { id: "revenue", span: 6, title: "Revenue", content: <Chart title="Revenue" data={[{ label: "Mon", value: 12 }, { label: "Tue", value: 18 }]} /> },
        { id: "signups", span: 6, title: "Signups", content: <BarList title="Signups" items={[{ label: "Web", value: 82 }, { label: "iOS", value: 64 }]} /> },
      ]}
    />
  )}
</Stateful>
```

### Narrow spans

A wide board is not a narrow one cut in half, so a widget can declare the width it wants when the grid reflows. Without `narrowSpan`, a widget of five columns or more takes the full board and anything smaller pairs up at half; every widget stacks full width at phone sizes.

```tsx
<DashboardGrid
  items={[
    { id: "revenue", span: 8, narrowSpan: 12, title: "Revenue", content: <Chart title="Revenue" data={[{ label: "Mon", value: 12 }, { label: "Tue", value: 18 }]} /> },
    { id: "signups", span: 4, narrowSpan: 6, title: "Signups", content: <BarList title="Signups" items={[{ label: "Web", value: 82 }]} /> },
    { id: "errors", span: 4, narrowSpan: 6, title: "Errors", content: <BarList title="Errors" items={[{ label: "5xx", value: 12 }]} /> },
  ]}
/>
```

### Compact

The density axis tightens the space between cells.

```tsx
<DashboardGrid
  compact
  items={[
    { id: "revenue", span: 4, title: "Revenue", content: <BarList title="Revenue" items={[{ label: "Pro", value: 82 }]} /> },
    { id: "signups", span: 4, title: "Signups", content: <BarList title="Signups" items={[{ label: "Web", value: 64 }]} /> },
    { id: "errors", span: 4, title: "Errors", content: <BarList title="Errors" items={[{ label: "5xx", value: 12 }]} /> },
  ]}
/>
```

## Do & Don't

### The order lives in the consumer's data

**Do**: Treat `order` as the single source of truth and persist every `onOrderChange` through your own API, so a layout survives a reload on any device.

```tsx
<Stateful initial={["signups", "revenue"]}>
  {(order, setOrder) => (
    <DashboardGrid
      unlocked
      order={order}
      onOrderChange={setOrder}
      items={[
        { id: "revenue", span: 6, title: "Revenue", content: <BarList title="Revenue" items={[{ label: "Pro", value: 82 }]} /> },
        { id: "signups", span: 6, title: "Signups", content: <BarList title="Signups" items={[{ label: "Web", value: 64 }]} /> },
      ]}
    />
  )}
</Stateful>
```

**Don't**: Don't pass a controlled `order` and drop the change on the floor: the drop completes and announces, and then the widget snaps back because nothing updated the array.

```tsx
<DashboardGrid
  unlocked
  order={["signups", "revenue"]}
  items={[
    { id: "revenue", span: 6, title: "Revenue", content: <BarList title="Revenue" items={[{ label: "Pro", value: 82 }]} /> },
    { id: "signups", span: 6, title: "Signups", content: <BarList title="Signups" items={[{ label: "Web", value: 64 }]} /> },
  ]}
/>
```

### `title` names the widget for assistive tech

**Do**: Give every widget the title its own header already shows. Nothing paints it, but customize mode reads it out: the grip announces "Reorder Signups", and moving the widget announces which one moved and what it landed against.

```tsx
<DashboardGrid
  unlocked
  items={[
    {
      id: "signups",
      span: 6,
      title: "Signups",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography h2>1,204</Typography>
          </CardContent>
        </Card>
      ),
    },
    { id: "revenue", span: 6, title: "Revenue", content: <BarList title="Revenue" items={[{ label: "Pro", value: 82 }]} /> },
  ]}
/>
```

**Don't**: Don't pass a slug, an id, or a placeholder. The board looks identical, and that is the trap: a keyboard or screen-reader user in customize mode is left dragging "widget-2" around with nothing to tell them which tile it is.

```tsx
<DashboardGrid
  unlocked
  items={[
    { id: "signups", span: 6, title: "widget-1", content: <BarList title="Signups" items={[{ label: "Web", value: 64 }]} /> },
    { id: "revenue", span: 6, title: "widget-2", content: <BarList title="Revenue" items={[{ label: "Pro", value: 82 }]} /> },
  ]}
/>
```

### Widgets bring their own surface

**Do**: Hand each widget a component that already carries a surface. The cell is bare on purpose, so a Card, a Chart, a Stats row, or a BarList lands with exactly one frame around it.

```tsx
<DashboardGrid
  items={[
    {
      id: "signups",
      span: 6,
      title: "Signups",
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography h2>1,204</Typography>
          </CardContent>
        </Card>
      ),
    },
    { id: "revenue", span: 6, title: "Revenue", content: <BarList title="Revenue" items={[{ label: "Pro", value: 82 }]} /> },
  ]}
/>
```

**Don't**: Don't hand-roll the widget frame out of a styled View. That rebuilds Card at the call site, drifts from the kit's radius and elevation, and is exactly the shim the bare cell exists to avoid.

```tsx
<DashboardGrid
  items={[
    {
      id: "signups",
      span: 6,
      title: "Signups",
      content: (
        <View style={{ backgroundColor: tokens.card, borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "600", color: tokens.foreground }}>1,204</Text>
        </View>
      ),
    },
  ]}
/>
```
