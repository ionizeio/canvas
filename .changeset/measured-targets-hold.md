---
"@ionizeio/canvas": patch
---

Give every moving glass selection one measurement contract (`useMeasuredTargets`): targets report their frames in an ancestor space keyed by their own identity, a structural change re-measures them before any surface moves, and a surface holds meanwhile, then travels when the target it sits on kept its frame and resets in place when that target moved or left, without unmounting (a remount lingers on iOS, where the native material fades out). The Sidebar's shell shape now measures its rows against an ancestor body, which native `measureLayout` requires: on iOS the rail's active row had jumped instead of travelling. The Sidebar rides through an accordion closing the section it left, and a non-collapsible section's open state no longer counts as structure. Pagination, Calendar, Navbar, Sidebar and Carousel share the hook.
