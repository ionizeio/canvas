---
"@ionizeio/canvas": patch
---

The kit's small controls now carry their touch slop from their first frame on iOS and Android instead of after their first layout: Button, the Pagination cells, the pressable Steps circles, the RowMenu trigger, the CodeBlock copy chip and the Switch seed it from the least box their skin gives (an icon square's size, or the padding and border around one line of label), and the measurement then refines it; a control whose declared box changes (a Button turning small or gaining an icon) seeds again. A native view that hugs one of them, such as a Tooltip's own root around a Button, a component root carrying a `testID` or the CodeBlock's floating copy wrapper, records the slop at its first layout, so a tap just outside the control reaches it from the start. `useMinTargetSlop` is unchanged apart from keeping its slop when a new layout differs by less than a device pixel. Nothing changes size or moves.
