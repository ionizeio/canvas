---
"@ionizeio/canvas": patch
---

On Android, TalkBack's touch exploration reaches the tabs, cards, rows and cells inside a horizontal scroller whose content fits again. A fitting `DataTable`, `CodeBlock`, `Carousel`, `Tabs` row, `Board` or calendar `Heatmap` disables its scroller on Android so it stops claiming sideways drags, and React Native's disabled horizontal scroller also drops every hover event before its children see one; touch exploration is made of hover events, so an exploring finger could not land on anything inside. The scroller now stays enabled while touch exploration is on (and until Android has reported it), where a finger explores rather than presses, and still stops claiming drags whenever TalkBack is off. The web and iOS are unchanged.
