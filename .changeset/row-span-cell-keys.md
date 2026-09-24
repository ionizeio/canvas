---
"@ionizeio/canvas": patch
---

A Row with `span` children no longer remounts a child when a sibling before it appears or disappears, or when an item is inserted ahead of it in a keyed list. The Row keyed each span cell by its position among the rendered children, and that position shifts whenever an earlier child turns to `null` or a new item comes before it, so React remounted every cell after it and a field in one lost its text and focus. Each cell now takes its child's own key: an explicit key where the child has one, and otherwise its slot in the children as written, empty slots included. This applies side by side and, with `stacks`, while stacked.
