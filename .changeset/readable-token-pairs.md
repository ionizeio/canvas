---
"@ionizeio/canvas": patch
---

Correct five resting foreground pairs while preserving their intent fills: light muted-foreground #71717b to #6d6d77, light success-foreground #ffffff to #042812, light warning-foreground #ffffff to #451a03, dark primary-foreground #fafafa to #ffffff, and dark destructive-foreground #fafafa to #460809. Validate semantic foreground pairs at 4.5:1 with a one-channel rounding margin, plus rendered Button, Badge and Alert text. Transient press opacity and ripple behavior are unchanged; these checks cover resting text.

Four-digit hex token overrides now parse correctly in alpha(). Validate hex shapes and finite opacity while preserving the existing opacity replacement for eight-digit hex and passthrough for functional colors. Document that mixOklab accepts opaque hex only and leaves translucent inputs unchanged.

Deduplicate visual capture routes when a component appears in multiple navigation groups.
