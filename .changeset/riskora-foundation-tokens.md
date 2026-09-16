---
"@ionizeio/canvas": minor
---

Rebrand the kit's foundation to the Riskora Dashboard UI Kit (Figma file
`YLbmaRirWTzivAzXirDTmX`): the colour tokens, the type scale, the elevation ladder, and a
new shape token set. This is the first of the phases that restyle the web look to that kit;
iOS and Android keep their HIG / Material 3 shapes and take only the brand.

Minor because it adds public API:

- `ThemeProvider` gains a `fonts` prop (`ThemeFonts`: a `sans` and a `mono` entry, each one
  family name or a map from weight to the face registered for it), and the kit's `Text` and
  `TextInput` primitives now apply the registered face to every kit label. Omit it and the kit
  renders in the system face as before. `typeface` names the brand faces (Urbanist, Geist Mono);
  `resolveFontFace` / `fontStyle` are exported for custom text nodes.
- `shape` (`ShapeTokens` per `PlatformKey`): the corner radii a platform's skins share
  (`control`, `field`, `card`, `dialog`, `menu`, `sheet`, `checkbox`, `pill`), mirrored as
  `--radius-field`, `--radius-dialog`, `--radius-menu`, `--radius-sheet`, `--radius-checkbox`
  in `styles/tokens/radius.css`. The web column is the Riskora shape (12 / 12 / 20 / 16 / 16 /
  30 / 6 / pill).

Token changes (both schemes, CSS and JS): a sky/400 `primary` (`#3da3f5` light, `#68cdff`
dark) whose label is the dark ink in both schemes (white-on-sky is 2.7:1), a charcoal-and-white
neutral family on one hue (page `#f8fafe` / `#111213`, card `#ffffff` / `#18191c`, ink
`#0d121b` / `#ffffff`, panel `#f6f7f8` / `#212327`), red/700 / green/800 / orange/800 status
fills that carry white text, a re-seeded chart series (sky first, the bar-highlight orange
second), and the sky family on the brand orbs (the `orb-*` keys are unchanged). Every pair is
solved to the kit's contrast floors where the source falls short; `tools/figma/riskora-variables.json`
vendors the source variables and the new `bun run check-figma` gate fails on drift or on a
token without provenance. The Claude-Design render-parity leg (`check-render`,
`tools/render-parity/`) is retired in its favour.

Type: the Typography roles are the Riskora ladder in Urbanist, titles at the regular weight
(display 64/70, h1 55/64, h2 40/48, h3 36/44, h4 28/36, h5 20/30, lead 20/30, body 16/24,
small 14/20, tiny 12/16, caption 12/16 medium uppercase), and the `fontSize` scale gains a
`7xl` step. Elevation: an ambient ladder in the ink with no offset (`0 0 20px` at 6% for the
standard shade, `0 1px 2px` at 4% for `sm`), mirrored in `styles/tokens/shadows.css` and the
`--p-*` transcriptions.
