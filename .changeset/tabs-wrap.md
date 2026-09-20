---
"@ionizeio/canvas": minor
---

`Tabs` takes `wrap`: a row longer than its container lays out on further lines inside
one track instead of panning in the overflow scroller, so every tab is on screen at once.

Minor because it adds a public option. The capsule track (iOS and web) squares its
corners off to the radius concentric with its pills when it wraps, since a capsule's
9999 on a track taller than one pill would round its ends into semicircles across the
corner pills; the Material 3 pills track does the same, and its underline tabs stack
their lines on the one divider. `block` never overflows and wins over `wrap`; a
`responsive` vertical rail honors `wrap` once it flattens. The docs example rail wraps
at phone and tablet widths now, where the scroller used to show only the first few
example labels with no scrollbar to say the rest were there.
