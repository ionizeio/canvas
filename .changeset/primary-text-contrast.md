---
"@ionizeio/canvas": minor
---

Add the optional `primary-text` color token so consumers can customize brand text separately from primary fills and their foreground labels. This new theme customization capability justifies the minor release. Built-in primary text now stays readable on the kit's neutral and layered tonal surfaces in both schemes, including Android selected tab pills and today's date within a Web Calendar range. Primary fills, standalone icon accents and filled-control foregrounds retain their colors.

Existing complete `ColorTokens` literals remain valid. `ThemeProvider` preserves primary-only rebrands by using that override for text unless `primary-text` is also supplied. Custom brand contrast remains the consumer's responsibility. Raw CSS handoff rebrands must also set `--primary-text`; `--primary-text: var(--primary)` restores their previous text-color behavior. Nested providers retain their existing independent token and scheme resolution.

Correct the Web ActionSheet CSS action and Cancel label aliases to match the existing neutral foreground used by its RN skin.

The default text contrast checks cover solid and tonal surfaces. Glass materials depend on the content behind them and need verification in the rendered app.
