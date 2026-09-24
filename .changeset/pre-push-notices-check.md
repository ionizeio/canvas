---
"@ionizeio/canvas": patch
---

The repository's pre-push hook now runs `notices:gen:check`, so a package.json or lockfile change that stales the docs' third-party notices is caught before a push rather than only in CI. Repository tooling only; nothing in the package changes.
