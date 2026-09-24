---
"@ionizeio/canvas": patch
---

The docs' `check:patches` script declares the `@happy-dom/global-registrator` it imports in the docs package, so it runs from a docs-only install. It resolved only through the root install before. Docs tooling only; nothing in the package changes.
