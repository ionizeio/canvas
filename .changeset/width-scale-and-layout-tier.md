---
"@ionizeio/canvas": minor
---

Add the layout tier that gives every component its width from its parent: a shared
width scale, the sizing natures, and (in the same release) the `Container` atom and
Row/Column twelfth spans.

Minor because it adds public API: the `widths` token scale (`xs` 320 .. `page` 1280,
Tailwind's `max-w` values copied by hand, no dependency) mirrored as `--width-*` in the
CSS hand-off, and `src/style/sizing.ts` with the two sizing natures every component
root now declares: `FILL` (`width: 100%` plus `flexShrink: 1` and `minWidth: 0`, so a
field fills a Column, shares a Row with a hugging button, and splits a Row equally with
another fill sibling) and HUG (`useHugStyle`, resolved against the nearest kit layout
container because Yoga ignores `fit-content` against a stretching parent and a bare
`alignSelf: flex-start` breaks cross-axis centering in Rows). `LayoutAxisProvider` /
`useLayoutAxis` publish a container's axis, whether it stretches, and whether it is a
content-sized cell; `useFillStyle` warns in development when a fill component sits in a
bare Column inside a Row (the one layout that still collapses `width: 100%`). The
`LayoutStyle` type (ViewStyle without the sizing keys) is the `style` a non-layout
component accepts.

The `Container` atom is the bounds provider (Bootstrap `.container` / `.container-fluid`):
it spans its parent, caps at one step of the width scale (`xs` .. `page`, default `page`,
`fluid` for no cap), centers itself (`start` pins it to the leading edge), and takes
horizontal gutters from Row and Column's pad scale. Row children take `span={1..12}`
(Bootstrap `.col-n`): the Row measures its own width and hands each spanning child a px
cell with the gaps in the arithmetic (the DashboardGrid twelfths math, now shared as
`spanWidth`), span rows wrap past twelve, and `stacks` ignores spans once stacked. Row,
Column, Container, Grid cells, and DashboardGrid cells publish the layout-axis context.
