---
"@ionizeio/canvas": patch
---

Split browser validation into four complete-suite shards and an independent registry-starter job so the growing suite can finish within its existing job limit. Preserve candidate verification in every shard and retain separately named reports without changing test coverage, retries, or per-test timeouts.
