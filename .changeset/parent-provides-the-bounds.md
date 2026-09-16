---
"@ionizeio/canvas": major
---

A component never dictates its own width: the input-like controls are FILL and the
parent layout container provides the bounds.

Breaking. Input, Textarea, Select, Autocomplete, Listbox, Slider, and Progress no longer
render at a fixed 320px (240 `narrow`, 480 `wide`); they fill the parent they are given
(`width: 100%` plus the row-sharing pair, `src/style/sizing.ts`). The `block`, `narrow`,
`wide`, and `fit` props are removed from those seven components, `useFieldWidth`,
`FieldWidthProps`, and the `fieldWidths` tokens (`--field-*` in the CSS hand-off) are
gone, and their `style` prop is now `LayoutStyle`: `ViewStyle` without `width`,
`minWidth`, `maxWidth`, `flex`, `flexBasis`, `flexGrow`, `flexShrink`, and `alignSelf`,
so a width shim at the call site is a type error. Form's two-column threshold moves from
the 480px field width to the `lg` step of the width scale (512).

Migration:

- A bare field that used to be 320 wide now fills its column. Where the old measure was
  the point, wrap the field in a Container step: `<Container xs>` is the old default
  (320), `<Container lg>` the old `wide` (512 for 480), and `<Container sm>` (384) or a
  Row `span={n}` cover the rest. `narrow` (240) has no step: give the field a Row span.
- Drop `block`: filling the container is now the only behaviour.
- `fit` (a Select hugging its value) is a bare `<Column>` inside a `<Row>` (Bootstrap
  `.col-auto`): `<Row><Column><Select … /></Column></Row>`.
- `style={{ maxWidth: … }}` / `style={{ width: … }}` on a field: move the bound to the
  parent (`Container`, `Column span`) and delete the style.
- A field inside a bare Column inside a Row collapses to its content (it always did; the
  fixed width hid it). Give that Column `span={n}` or `fill`; `useFillStyle` warns in
  development when it sees the case.

Also in this release: every non-layout component's `style` prop is `LayoutStyle` (the
sizing keys are a type error; Row, Column, Grid, Container, the shells, and the floating
overlays keep `StyleProp<ViewStyle>` because they are the bounds providers); Card, Feed,
StackedList, ActionPanel, Skeleton, Sparkline, every SVG chart root, and the Calendar
containers are FILL with no cap of their own (Alert loses `narrow`/`wide`/`block`,
Sparkline its intrinsic 120px, the Calendar timelines their desktop widths); Skeleton
text lines take `long` / `short` instead of a width; the width scale gains the `xxxs`
(192) and `xxs` (256) tile steps; and the docs generator rejects `width` / `maxWidth` /
`minWidth` in a `style` on any non-layout tag, so the showcase composes bounds with
`Container`, Row `span`, and `Grid`.

`Container` conforms to its parent by default: no cap and full width unless a step is
named (`page` is now an explicit step, not the default). MediaObject, DescriptionList,
EmptyState, Collapsible, Accordion, Form, Field, Stats, and DataTable are FILL too, and
the docs examples render every component at the width its parent gives it; a Container
step appears in a fence only where the measure is the lesson.
