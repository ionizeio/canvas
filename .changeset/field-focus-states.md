---
"@ionizeio/canvas": patch
---

Every field shows a keyboard focus state. The web Autocomplete field turns its border `ring` while focused as well as while its list is open (and stays so after Escape closes the list over a still-focused field); the web Stepper box turns its border `ring` while its value field holds focus, and a bare iOS or Android Stepper field keeps the themed focus ring; the Command search row's rule turns `ring` and thickens while the search field holds focus; the web Select trigger turns its border `ring` while its list is open, as Dark Factory's select does; a flush Textarea keeps the themed ring inside itself. Under Increase Contrast a border that shows a state (a focused or errored field, an open trigger, a focused slider knob) now keeps its colour instead of being overwritten by the contrasting hairline.
