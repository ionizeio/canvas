---
"@ionizeio/canvas": patch
---

Route lookout's docs sweep through each sidebar group's own path base. The Templates
and Patterns groups live at `/templates/<slug>` and `/patterns/<slug>`, but
`lookout.config.ts` filed every sidebar entry under `/components/`, so those 24 pages were
never captured and the `calendar` template was folded into the Calendar component's
route. Template and pattern pages render `MockupDocPage`, which has no preview card, so
they are shot full-page; the component reference keeps its element shot and overlay
states. No kit code changes.
