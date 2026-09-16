---
"@ionizeio/canvas": patch
---

Honor iOS accessibility escape on existing overlay content hosts. Dismiss the
foremost active child before its parent, preserve controlled cancellation policy,
and share ownership with native modal close requests without changing layout.
Route focused Input and Textarea Escape through the same overlay policy while
preserving consumer handlers, local editing cancellation and IME candidates.
