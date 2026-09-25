---
"@ionizeio/canvas": patch
---

On Android, a horizontal scroller whose content fits no longer claims a sideways drag. Android's horizontal scroll view takes any drag that moves sideways past touch slop even when it has nothing to scroll, so a `DataTable` that fit its container (always wrapped in its scroller since its rows stay mounted across the pan width) dropped a row's press when the tap drifted sideways, and a swipe that started across it could not scroll the page for that gesture. The same held for a `CodeBlock` whose lines fit and a `Carousel` with nothing to page. These scrollers now take a drag on Android only while their content overflows. The web is unchanged: a disabled scroller there would set `touch-action: none`, and a finger on it could no longer scroll the page.
