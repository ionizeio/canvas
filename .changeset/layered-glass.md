---
"@ionizeio/canvas": minor
---

Layer the glass model: under glass EVERY surface renders through the material, each
on the layer it belongs to, and the option lists, alert dialogs, toasts and tooltips
take the densest tint instead of opting out.

Minor because it adds public capability: `GlassSurface` gains `layer` ("functional"
| "content" | "control" | "dense", the under-fill it paints beneath the material) and
`brand` (a brand-tinted puck: the colour as the under-fill, solved by `brandTint` to
stay as sheer as its ink's WCAG 4.5:1 allows, or the GlassView's own `tintColor` on
iOS 26); the kit exports `GlassPane` (the material as a sibling BEHIND a node that
owns its own interaction or semantics, with `paneStyle` and `PANE_SIBLING_INPUT`),
`innerFill` / `withInnerFill` / `isGlass` / `inverseDenseTint` (`src/style/glass-fill`),
the WCAG helpers `channelsOf`, `composite`, `relativeLuminance`, `contrastRatio` and
`inkOn` (`src/style/color`), `HUE_WASH`, and three glass tokens beside `glass-tint`:
`glass-tint-content`, `glass-tint-control` and `glass-tint-dense` (`--glass-tint-*` in
the CSS hand-off). `AnchoredOverlay` gains `dense`; `opaque` remains for a consumer
that wants the plain box and wins when both are passed.

What a glass app looks like now, by layer:

- FUNCTIONAL (sheer): Navbar, TabBar, Sidebar, Dialog, ActionSheet, Popover,
  Command, the calendar peek, a Tabs track, and the Drawer panel, which was the one
  overlay that painted an opaque card before.
- CONTENT (denser, legible first): Card, DataTable, the lists, feeds, stats,
  description lists, grid-list tiles, board columns, calendars, code blocks,
  carousels, alerts, empty states, every chart, the bordered FilterPanel, the Skeleton
  card. A selected Card and a toned Alert pass their tint.
- CONTROL (the bright puck): the field boxes (Input, Textarea, Select, Autocomplete,
  PhoneInput, Stepper, InputOTP), Button, Tabs pills, Pagination cells, Chip, Badge,
  Kbd, Switch tracks, Checkbox boxes, Radio rings and cards, Progress rails, Steps
  circles. A brand fill (a primary or destructive Button, a checked Switch or
  Checkbox, a selected tab, page, day or step) is brand-tinted glass with the intent's
  foreground on top; a hue wash (a status Badge, a coloured Chip) is the hue's mid
  step with the label one step deeper (800 in light, 300 in dark) so every palette
  hue holds 4.5:1 over the page, a content pane and a control puck; a control with no
  surface of its own (a ghost or link Button) stays bare.
- DENSE (the densest tint): Dropdown, Select, Autocomplete, RowMenu, the SplitButton
  overflow, the PhoneInput country list, AvatarMenu, AlertDialog, Toast, Tooltip and
  the chart value flag. The inverse ones (the Tooltip bubble, the M3 snackbar) tint
  with the ink so their inverse text keeps its contrast.

Fills inside a surface (a hovered or selected row, a header band, a stripe, a code
pill, a Skeleton placeholder) become ink tints under glass; a state border (a focus
ring, an error edge, an open trigger) stays over the pane while the resting hairline
drops and the material's rim is the edge. Solid mode is untouched: every one of these
renders the same tree it did before, and under Reduce Transparency or Increase
Contrast every layer degrades to its opaque token.

The named-import size budgets move (Button 8,704B, Input 39,936B, DataTable 46,080B
gzip): a control is a glass surface now, so importing one carries the material stack
a consumer used to pay for only with an overlay or a bar.
