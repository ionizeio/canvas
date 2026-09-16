---
"@ionizeio/canvas": minor
---

Add typed public React refs to Button, Select, Checkbox, Switch, Radio, and Slider. This minor release adds a public capability: consumers can access each control's interactive React Native host for focus, blur, and measurement, using object or callback refs. Select retains overlay measurement and Radio retains group focus navigation. Native focus delegates to the host and remains separate from accessibility focus. Document the actual inferred ref types in component API tables.

Fix Space activation for Checkbox, Switch, and Radio on web, including key release, disabled and composition guards, and cancellation when focus leaves the control. Preserve Enter and pointer activation without duplicate callback ownership.
