---
"@ionizeio/canvas": patch
---

Progress, Emblem and Swatch take Dark Factory's look. A progress bar is a meter, so it fills with the call-to-action `action` color on every platform (Dark Factory fills its meters green), its `warning` and `danger` tones read their colors from `statusColors`, and the web bar is Dark Factory's slim meter (4, 6 or 8px, on its line color, in its dense label type); iOS and Android keep their bars, recolored. Emblem washes each tone with its soft role from `statusColors` (its monogram in the tone's text-grade ink) and takes Dark Factory's 10/12/14px tile corners, and Swatch the same corners; both render the web look on iOS and Android, which ship no such control. A `tokens` override that repaints `primary`, `success`, `warning` or `destructive` now repaints that tone's soft wash too, at Dark Factory's alpha for the scheme, unless the override sets the soft role itself. No prop changes.
