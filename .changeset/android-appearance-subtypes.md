---
"@ionizeio/canvas": patch
---

Correct native smoke appearance validation to preserve Android's automatic mode
and both writable custom subtypes. A shared parser rejects ambiguous or malformed
output before device mutation, preventing an attempt with an unrestorable value.
This is a tooling correction; product theme behavior is unchanged.
