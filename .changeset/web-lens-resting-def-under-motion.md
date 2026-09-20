---
"@ionizeio/canvas": patch
---

The web Liquid Glass lens keeps one filter definition while a popup's material animates.

A glass popup's pane (Autocomplete, Select, Dropdown, AvatarMenu, Command, Popover, the
calendar peek) is resized by its opening spring on almost every frame, and the lens layer
used to acquire a fresh sized `<filter>` for each of those sizes: a new data-URI SVG
document for Chromium to parse, plus two commits on the layer, per frame. The lens layer
now takes the bounds the pane settles at (the card's measured size, carried with the
material's frame through the material motion context) and holds that one definition
through the travel and the close, so an opening costs one definition instead of thirty
to forty and the resting definition is exactly the one the settled layout would have
acquired. Surfaces that do not move keep measuring themselves on layout as before.
