---
"@ionizeio/canvas": patch
---

The manual `E2E soak` workflow keeps a record of a browser that crashes outright: every lane saves the kernel's line for each process a fault killed (the thread, the address, and the module and offset of the instruction), and `crash_dumps: on` keeps each crashed process's core dump with a gdb report of every thread's stack, the signal and Mozilla's crash reason (`scripts/soak-crash-dumps.mjs`), after first proving the capture on a browser the lane crashes itself. Playwright's Firefox has no crash reporter of its own, so this is the only record of the rare Firefox parent-process SIGSEGV the Firefox journeys meet. Repository tooling and tests only; nothing in the package changes.
