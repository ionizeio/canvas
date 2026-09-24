---
"@ionizeio/canvas": patch
---

Popover and Tooltip take Dark Factory's type. The Popover heading and description are Dark Factory's heading over its body in the muted ink on every platform; on Android, which has no popover, the panel is now the web's Dark Factory card with its hairline and popover shadow, and iOS keeps the iPad popover with its beak. The Tooltip keeps its inverse bubble (dark in the light scheme, light in the dark one, since Dark Factory has no tooltip and its one-colour toast pill would all but vanish on the dark page) with its label in Dark Factory's 12 px label weight; iOS, which has no tooltip, shows the web bubble, and Android keeps the Material 3 plain tooltip.
