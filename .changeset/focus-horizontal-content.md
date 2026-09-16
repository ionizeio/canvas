---
"@ionizeio/canvas": patch
---

Make overflowing CodeBlock and DataTable content reachable by keyboard using the native ScrollView focus props. Add a tab stop only while content overflows, preserving ordinary arrow-key scrolling, table semantics, native touch scrolling, and code wrapping. Restore native and web heading semantics to token-reference page titles and sections.
