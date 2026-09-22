// Entrance holds an overlay's card until its owner is ready to show it (a hosted
// card's fitted placement, see AnchoredOverlay). While held the card is in the
// tree, laid out and measurable, but invisible and inert, so a menu never flashes
// at the wrong place and focus never lands on a card whose geometry has not
// committed. Overlays unmount on close, so there is nothing to hold on the way
// out. There is no motion: the card appears in place the moment it is ready.

import { type ReactNode, useContext } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { EntranceReadinessContext } from "./entrance-readiness.js";

export interface EntranceProps {
  /** Hold visibility until the owner has measured its final placement. */
  ready?: boolean;
  /** Layout/position for the wrapper (a menu's absolute left/top; a dialog's width caps). */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

// Invisible while held. Opacity, not display: the card must lay out (and report
// its size to the owner's fit) while it is hidden.
const HELD: ViewStyle = { opacity: 0 };

export function Entrance({ ready = true, style, children }: EntranceProps) {
  const inheritedReadiness = useContext(EntranceReadinessContext);
  const held = !ready;
  return (
    <EntranceReadinessContext.Provider value={inheritedReadiness && !held}>
      <View
        pointerEvents={held ? "none" : "auto"}
        accessibilityElementsHidden={held}
        importantForAccessibility={held ? "no-hide-descendants" : "auto"}
        aria-hidden={held}
        style={[style, held ? HELD : null]}
      >
        {children}
      </View>
    </EntranceReadinessContext.Provider>
  );
}
