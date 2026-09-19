---
"@ionizeio/canvas": patch
---

The web Tabs and TabBar now share the iOS liquid-glass anatomy, and the iOS TabBar takes the iOS 26 floating bar.

Tabs on the web are the iOS capsule segmented control: a gray capsule track with a raised pill in solid mode, and under glass the same track as a functional-layer pane with the selection travelling as the liquid-glass puck. Both the default and the pill looks take the anatomy (the underline rule and the hairlined segment bar are gone on web); Android keeps its Material underline. The browser's keyboard focus ring stays.

TabBar on iOS and web is the iOS 26 floating tab bar: a capsule inset from the sides that hovers above the content (which scrolls beneath it), the safe-area inset kept under the capsule, and the selected destination raised as a capsule covering its whole cell, which under glass is the measured liquid surface that travels between destinations. The skin contract gained `fill`, `floating` and `pillCovers` for that; Android's docked Material 3 bar and its icon pill are unchanged.
