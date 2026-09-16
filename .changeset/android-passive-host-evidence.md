---
"@ionizeio/canvas": patch
---

Preserve bounded passive Android CI host evidence around native smoke failures,
including ADB executable identities, actual listener/process identities, resource
samples and existing daemon-log tails. Capture failure state before appearance
restoration while retaining the original test error, exit code or signal.

This is a tooling observability correction. It does not change ADB lifecycle,
trace settings, tool versions, build order or native test commands, and it does
not retry failures or claim that the underlying transport disconnect is fixed.
