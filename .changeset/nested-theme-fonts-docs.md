---
"@ionizeio/canvas": patch
---

Document how typefaces pass through nested providers. The Theming page gains a "Typefaces and nested providers" section: register the faces once on the root provider's `fonts`, a nested `ThemeProvider` keeps them, and its scheme, palette, surface and tokens stay its own (pass the same `tokens` constant to carry a rebrand in, and both `dark={dark}` and `light={!dark}`, with `dark` from `useTheme()`, to follow the parent's scheme). The README's Theming list documents `fonts` and says a nested provider resolves only its own `tokens`, the Typography page says the faces hold under nested providers, and a docs search for fonts, typefaces or nested providers now reaches the Theming page. The Theming page's palette previews drop the `fonts` prop they repeated, since they now inherit the docs' faces.
