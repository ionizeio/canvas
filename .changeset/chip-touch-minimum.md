---
"@ionizeio/canvas": patch
---

On Android a tappable Chip's touch area is now the 48dp minimum, measured from the chip without it changing size: 7dp above and below the 34dp chip, and nothing sideways once the chip is 48dp wide, so chips side by side in a Row no longer reach into each other. A tappable chip with a remove glyph reaches the same minimum from its label, which covers the whole chip up to the glyph. iOS keeps the 11pt of extra touch area it has always had around its 25pt chip. The chip's docs state both.
