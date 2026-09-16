---
"@nannier-com/canvas": major
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
