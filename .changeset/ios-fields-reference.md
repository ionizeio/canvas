---
"@ionizeio/canvas": minor
---

Draw the iOS field family to the iOS input-field reference, and give Input the
password toggle and the clear button.

Minor because it adds public capability: `Input` gains `passwordToggle` (a trailing
eye that reveals and re-masks a `secureTextEntry` value, announced as "Show
password" / "Hide password"), `clearable` (a trailing circled-x that empties the
field while it holds text, in both the controlled and uncontrolled mode), and its
`icon` now accepts ANY Canvas glyph name (`IconName`: phone, calendar, creditCard,
mapPin, ... instead of six hard-coded names); `SelectOption` gains `leading`, a short
glyph (a flag emoji, a currency sign) shown before the label in the trigger and in
the option rows; and the token set gains `field-border`.

The iOS skins of Input, Textarea, Select, Autocomplete, InputOTP and Field now follow
the "iOS Mobile Input Fields" design (light and dark): a white `card` box, an 8pt
corner (`shape.ios.field` is now 8, was 10), a 16pt value, a 14pt regular
`muted-foreground` title 8 above the box, a 20px leading glyph, a boxed muted prefix
or suffix addon with a divider (was inline affix text), a gray ▾ select caret (was the
brand ⇅), and three states: focus tints the border, the glyph and the caret to the
brand `ring`/`primary`; error tints the border and the glyph `destructive` and washes
the box with a red-50 fill (`fieldErrorFill`, derived from `card` + `destructive`);
rest paints the new `field-border` hairline.

DISCLOSED ACCESSIBILITY TRADE-OFF. `field-border` (gray-300 `#d1d5db` light, systemGray4
`#3a3a3c` dark) is about 1.5:1 against the field's own fill, BELOW the 3:1 WCAG 1.4.11
boundary that the `input` token is held to. It is read only for the RESTING state of
the iOS field skins (through `fieldBorder` in `src/style/field-colors.ts`, which falls
back to `input` for a token map that omits it); the web and Android skins keep `input`,
and the focus and error borders keep their full-strength tokens on every platform. The
choice was made deliberately on 2026-09-16 so the iOS fields read as the iOS reference.
