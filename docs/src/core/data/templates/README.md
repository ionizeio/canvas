# Template authoring contract

Every template in this directory is a LIVE demo built from real Canvas
components (the render path in `TemplateSection`). No HTML-string mockups, no
hand-rolled look-alikes, and no dead controls.

## File shape

One file per template, exporting a single `TemplateDoc`:

```tsx
import { useState } from "react";
import { Row, Column, Card, Typography, Button /* ... */ } from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

function SectionLive() {
  const [state, setState] = useState(/* demo state */);
  return /* kit components only */;
}

export const EXAMPLE_TEMPLATE: TemplateDoc = {
  slug: "example",
  name: "Example",
  description: "One sentence. End with: Built from live Canvas components.",
  sections: [
    { title: "…", anatomy: "…", render: () => <SectionLive /> },
  ],
};
```

Hooks live in named function components (`render: () => <SectionLive />`),
never directly inside `render`. Register the export in `../templates.tsx`.

## Interactivity is required

A template is a working product surface, not a picture of one:

- Every control is operable. Inputs type (uncontrolled or controlled), selects
  select, switches flip, tabs switch, accordions open, checkboxes check.
- Every Button has an `onPress` that visibly does something. Prefer a real
  state change (append the invited teammate, remove the revoked key, send the
  chat message, open the pressed thread). Where the real action would leave
  the page (Export, Contact sales, Update card), fire a toast instead:

  ```tsx
  import { useToast } from "@ionizeio/canvas";
  const { toast } = useToast(); // inside a component; ToastProvider is mounted in the docs root
  toast({ success: true, message: "Invite sent", description: "ada@acme.com will get an email." });
  ```

- Demo state is component-local (`useState`) and resets on remount. That is
  correct for docs; do not persist.
- Lists that claim to filter, select, or paginate must actually do it on the
  demo data.

## Hard rules

- Kit components and primitives ONLY (`View`, `Text`, `Pressable`, `Image`,
  `TextInput`, `ScrollView` are the allowed primitives). Never re-implement a
  control that exists in `src/atoms|molecules|organisms|charts`.
- Semantic boolean props, never `variant="..."`/`size="..."` strings.
- `style` is ONLY for outer sizing/flex composition (`width`, `maxWidth`,
  `minWidth`, `flexBasis`). Never colors, borders, radii, fonts, padding,
  margins, gaps: those come from component props and `Row`/`Column` axes.
- No `Platform.OS` branches, no web-only DOM/CSS tricks. Cross-viewport
  behavior uses `useFormFactor() === "phone"` (desktop-first: phone is the
  `sm` bucket, 640px and below), or `useResponsive({ base, sm })` when a
  value, not a tier, varies. A breakpoint flag may only change PROPS
  (`compact`, `inline`, a gap), never which element renders: returning a
  Column on phones and a Row elsewhere remounts the whole subtree whenever
  the window crosses the cut and right after hydration on a phone (the server
  renders the desktop variant), so every field drops its text and focus.
  Layouts that restructure use the container-measured kit primitives below.
- Do not edit kit source (`src/`) from a template task. If a component is
  missing a capability, note the gap in your report instead.
- Check exact props in the component's own doc:
  `src/<atoms|molecules|organisms|charts>/<name>/<name>.md`. Icon glyph
  booleans are camelCase; verify a glyph exists in
  `src/atoms/icon/icon.glyphs.ts` before using it.
- Desktop-first and responsive: verify mentally at ~860px stage width AND
  ~300px (phone). Multi-column rows wrap (`Row relaxed wrap` + per-child
  `style={{ flexBasis: 300, minWidth: 280 }}`), content-sized rows stack via
  `Row stacks`, and pane splits are a `Row stacks` of `span` children
  (`span={6}` twice for halves, 8 and 4 for main and sidebar). Size the
  narrow pane for its content just above the cut (the inbox list takes 5 of
  12 to keep a sender's name whole) and pass `stackBreakpoint="md"` when it
  cannot fit a tablet-width section at all.
  Fixed-width boards/tables pan inside a horizontal `ScrollView`.

## Definition of done

`cd docs && bunx tsc --noEmit` passes, and every visible control on the page
does something when pressed.
