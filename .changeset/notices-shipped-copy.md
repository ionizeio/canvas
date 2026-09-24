---
"@ionizeio/canvas": patch
---

The docs' third-party notices now name the exact copy of each package the site ships. The notices scan records the directory every shipped package came from, and the generator reads version and licence from there instead of looking the name up, so a dependency installed twice can no longer be reported at a version the site does not ship. The regenerated list adds mdn-data (CC0-1.0), whose CSS data css-tree compiles into the native bundles and which the scan now sees by reading Metro's own source maps. Docs tooling only; nothing in the package changes.
