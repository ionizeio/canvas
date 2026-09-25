---
"@ionizeio/canvas": patch
---

An option list whose rows overflow its card (Select, Autocomplete, the PhoneInput country list, Command, or any anchored card's content) now shows the theme's focus ring on the web when its scroll area takes keyboard focus, instead of the browser's blue one clipped by the card's corners. The scroll area sits flush inside the card's clip, so the card draws the ring around itself, the same solid 2 px `--ring` at the kit's offset that CodeBlock, DataTable and Carousel cards now draw, and only while a key lands on the list (Shift+Tab from its first row, or a key pressed on it); a click draws none. The bare Command palette's card does the same for its result list. iOS and Android are unchanged.
