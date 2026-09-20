---
"@ionizeio/canvas": patch
---

Unblock the release pipeline after the npm scope migration. The ordinary starter stays on the scope the registry serves Canvas from today (`@nannier-com/canvas@2.62.1`) and compiles against it, the sealed native candidate is installed under that declared dependency name so the smoke fixtures exercise the candidate, and the starter journey resolves the declared package instead of a hardcoded scope.
