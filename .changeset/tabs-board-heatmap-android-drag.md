---
"@ionizeio/canvas": patch
---

On Android, the horizontal scrollers in `Tabs`, `Board` and the calendar `Heatmap` no longer claim a sideways drag while their content fits. Android's horizontal scroll view takes any drag that moves sideways past touch slop even when it has nothing to scroll, so a tab row, a board or a contribution grid that fit its container dropped a press when the tap drifted sideways (a tab, a card, a day cell), and a swipe that started across it could not scroll the page for that gesture. Each now takes a drag on Android only while its content overflows, the rule `DataTable`, `CodeBlock` and `Carousel` already follow. Selecting a tab still scrolls it into view. The web and iOS are unchanged, and the shared scroll measurement now re-renders a scroller only when its content starts or stops overflowing, not on every resize.
