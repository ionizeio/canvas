---
"@ionizeio/canvas": patch
---

Radio on iOS is now a checkmark list, since iOS has no radio button: each option's label leads and the chosen option carries a trailing check in the brand color, and a RadioGroup's plain options form one inset-grouped section (44 pt rows, 16 pt insets, an inset hairline between two rows, the 26 pt continuous corner of the kit's iOS lists) that fills its parent and is a content-layer pane under glass. `card` options stay tiles and mark the choice with the same trailing check, and on iOS the list stays vertical when the group asks for a `row`. The web and Android keep the ring and dot, and the role is `radio` everywhere. RadioGroup is now built per platform from the Radio skin (it is exported from the same entry as Radio, with no change to its props), and the docs three-up shows its iOS and Android builds.
