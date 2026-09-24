---
"@ionizeio/canvas": patch
---

Listbox rows take Dark Factory's menu row on every platform: bold 12.5 px labels at an 8 px corner, 2 px apart, a muted micro second line, the bordered list in Dark Factory's panel corner, and the hover wash on the web. The chosen single-select row now reads in the selection violet (its label in `primary-text`, the checkmark in `primary`) with no fill, where it used to be filled; iOS keeps its trailing check with a plain label, and multi-select keeps each platform's selection checkbox.
