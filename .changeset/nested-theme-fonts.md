---
"@ionizeio/canvas": patch
---

A nested `ThemeProvider` that does not pass `fonts` now keeps the nearest parent provider's registered typefaces, instead of resetting every kit label under it, and every overlay it opens, to the platform's system face. The faces are an app-level registration (what the app loaded), so a provider nested inside the root one, or inside portaled content, paints in them too. An explicit `fonts` still wins, and it replaces the parent's map whole (the roles are not merged). `tokens`, the scheme, the palette and the surface stay per provider, as before: a nested provider is how a subtree shows its own palette or brand, so pass the same `tokens` constant again to carry a rebrand into one.

This changes documented nested-provider behavior: the `fonts` prop said that omitting it renders the kit in the system face, and a nested provider that omitted it did exactly that. It ships as a patch on the stated assumption that no consumer relies on that reset (no known consumer passes `fonts` today). To keep a subtree in the system face on purpose, pass it an empty map, `fonts={{}}`, held in a module constant so the theme value stays stable.
