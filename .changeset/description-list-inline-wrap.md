---
"@ionizeio/canvas": patch
---

An inline DescriptionList no longer runs past a narrow container. The value side of each row could not shrink, so in a sidebar card about 250px wide a mono id beside its Copy button pushed the button past the card's edge while only the term wrapped. Now a value that does not fit beside its term wraps onto its own line under the term, still at the trailing edge, so every value and every Copy button stays in one column; a value wider than even its own line ellipsizes (a copyable value) or wraps (plain text). Rows that already fit lay out exactly as before, on the web, iOS and Android.
