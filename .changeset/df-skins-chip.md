---
"@ionizeio/canvas": patch
---

Chip takes Dark Factory's look on the web and iOS (iOS ships no chip control, so its skin is the web skin): the neutral chip is Dark Factory's quiet borderless pill with an 11px bold label, a coloured chip is its soft pill (the status tones from `statusColors`, so a success chip matches a success Badge and Alert; a free palette hue at Dark Factory's soft alpha under its deep label, in solid and glass alike), `primary` is the primary color's soft pill instead of a fixed indigo, and a selected filter chip is the solid primary. Android keeps its Material 3 chip, recolored: the outlined idle chip and the tonal selected filter chip with its checkmark. `HUE_WASH` is deprecated: the kit no longer paints with it. No prop changes.
