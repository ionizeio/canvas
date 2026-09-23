import { typeScale } from "../../style/type-scale.js";
import { type DividerSkin } from "./divider.shared.js";

// Per-OS Divider skins. Divider is a "Shared" treatment: a thin rule reads the same on every
// platform (SwiftUI Divider, the Material 3 1dp divider, and Catalyst's <hr> are all a single
// hairline with no native shape to diverge on). So the skin values are identical across iOS,
// Android, and web. `webSkin` carries Dark Factory's look (its Divider is a 1px rule in the
// line color): a 1px rule, a gap-12 label row, and a label in Dark Factory's eyebrow, the
// muted uppercase caption it gives every small section and field label (10/13, 700, +0.18em);
// the iOS and Android skins reference it directly so there is one look everywhere.

export const webSkin: DividerSkin = {
  ruleThickness: 1,
  labelGap: 12,
  labelType: typeScale.eyebrowLg,
};

// Shared treatment: no per-OS divergence, so the native skins are the web skin.
export const iosSkin: DividerSkin = webSkin;
export const androidSkin: DividerSkin = webSkin;
