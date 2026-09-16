---
"@nannier-com/canvas": minor
---

The measure axis on components: the Container steps, on the field or button itself.

Minor because it adds public API. `MeasureProps` (`src/style/sizing.ts`) is the boolean
step axis `Container` already reads (`xxxs` 192, `xxs` 256, `xs` 320, `sm` 384, `md` 448,
`lg` 512, `xl` 576, `xxl` 672, `xxxl` 768, `wide` 896, `wider` 1024, `widest` 1152, `page`
1280, plus `start`), and eleven components now carry it: Input, Textarea, Select,
Autocomplete, Listbox, Slider, Progress, Field, Form, Button, and ButtonGroup. So a short
field or a call-to-action names its own measure without a wrapper:

```tsx
<Autocomplete xs start options={people} />
<Button md>Continue</Button>
```

A step is not a width of the component's own. It is the FILL nature capped at that step
of the shared width scale (`maxWidth`), so below the step the component still fills the
parent it is given, exactly as `<Container xs>` around it would; without a step nothing
changes (a field fills its parent, a button hugs its label). The grammar and the
precedence are Container's: narrowest step wins when several are passed, a step centers
the box in its column, `start` pins it to the leading edge. Two rules the component
adds because it is not a layout container: inside a Row only the cap applies (there
`alignSelf` is the cross axis and would pin a field to the top of the row, so the Row's
own alignment places the box), and on Button and ButtonGroup a step wins over `block`
(the segmented and spaced kinds flex their segments to equal shares under a step as they
do under `block`; split and stepper ignore both with the same dev-only warning).
`ContainerProps` extends `MeasureProps`, `stepOf` is the shared precedence, and
`useFillStyle` / `useSizing` take the component's props so a new adopter is one line.

Also: the design hand-off parity records for the field widths the layout tier removed
(`narrow`, `wide`, `block` on Input, Select, Textarea, Autocomplete, Slider, and Alert),
which the check had been failing on.
