---
"@ionizeio/canvas": patch
---

DESIGN.md (Shapes) and the Button and Chip docs now state where a small control's touch area reaches on iOS and Android, in React Native's own terms: a touch area never reaches past a native ancestor that does not contain it (a container that clips stops it at its edge, and one that paints, carries a `testID` or handles pointer events admits it only as far as its last recorded layout), and where two touch areas overlap the later sibling takes the tap. The kit's own clipping views carry the touch area of the controls inside them and a component splits the gap between two of its own controls; between controls you place it does not, so leave at least twice the extra touch area between small controls in your own layouts, or split the seam in a control you build with `useMinTargetSlop`.
