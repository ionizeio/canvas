---
"@ionizeio/canvas": patch
---

The end-to-end suite gains an opt-in record of the protocol events that decide which JavaScript worlds Playwright can reach in a page (execution contexts created, destroyed and cleared, navigations, and every evaluation with whether it was answered), attached to a failed test when `E2E_PROTOCOL_EVENTS=1`; the manual `E2E soak` workflow turns it on with `protocol_events: on`. Repository tooling and tests only; nothing in the package changes.
