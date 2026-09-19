---
"@ionizeio/canvas": patch
---

The moving glass selections whose surface is a brand puck (numbered Pagination,
Calendar days, the Navbar's iOS brand skin) now keep their label readable through
the flight: the label ink follows the travelling surface instead of switching to
`primary-foreground` at the press, so a newly selected number stays in its resting
ink until the puck is under it and the label the puck leaves takes its resting ink
back as the puck departs. A target's own resting tile (the web page cell's border,
the iOS neutral link capsule) dissolves under the arriving surface and re-forms
behind it rather than popping. This is a shared measured-selection contract
(`ink` / `uncovered` / `SelectionText`), so any future moving brand-puck selection
inherits it.

The brand fill of a glass puck now paints over the frost and lens material rather
than beneath it, so the colour the contrast solver chose is the colour that
renders: a settled `primary-foreground` label on a brand puck holds >= 4.5:1 on
both schemes, fixing the too-dark settled puck the frost produced on the dark
scheme (Calendar days and Pagination pages). Layer tints and explicit tints are
unchanged, and iOS 26's native Liquid Glass path (the brand as its GlassView
tintColor) is unchanged.
