---
"@ionizeio/canvas": patch
---

The `E2E soak`'s crash report reads the fault a crashed process's own signal handler caught, from the signal frame on its stack: Firefox's parent process catches SIGSEGV and re-raises it, so the signal its core records is the re-raise and the kernel logs no segfault line for it. The report now gives both the signal the process died of and the one its handler caught first (with the fault address or sender, and the interrupted instruction and registers), and the lane's self-test checks the caught one. Repository tooling and tests only; nothing in the package changes.
