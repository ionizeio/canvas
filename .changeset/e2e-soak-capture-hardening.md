---
"@ionizeio/canvas": patch
---

The `E2E soak`'s crash capture reads a core's executable from the auxiliary vector gdb reads (file(1) gives up on a core of more than 2048 program headers, which a long-lived browser can reach), names the trap behind a fault (a page fault's read, write or instruction fetch and its address, which the kernel does not log for Firefox's parent), labels SI_KERNEL as a general protection fault or an undeliverable signal, keeps every core, report and browser build even when one of them fails, and moves that work into `scripts/soak-crash-dumps.mjs keep`. The lane's self-test now crashes the browser process itself even behind WebKit's launcher script, gives up after 30 seconds instead of waiting out the job, and puts its core through the same `keep` path, checking the compressed core and that the build archive holds the executable. Repository tooling and tests only; nothing in the package changes.
