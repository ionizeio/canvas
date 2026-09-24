---
"@ionizeio/canvas": patch
---

The docs' `check:patches` script now states that it resolves `@happy-dom/global-registrator` from the workspace root install, which CI runs before the docs install, and why the docs package must not declare it: under the docs' Metro resolution (`disableHierarchicalLookup`, bare imports from docs/node_modules only), a docs dependency's transitive packages can replace what the site's bundles resolve. Docs tooling only; nothing in the package or the site's bundles changes.
