import { useContext } from "react";
import { Animated, StyleSheet, type LayoutChangeEvent, type LayoutRectangle } from "react-native";
import { GlassSurface, View, alpha, useTheme } from "../../style/index.js";
import { PopupHandoffContext, shapeRadius } from "../../style/popup-handoff.js";
import * as s from "./button-group.styles.js";

/** A material sibling behind the controls, so it never clips focus or intercepts taps. */
export function GroupGlass({ selected = false, testID }: { selected?: boolean; testID?: string }) {
  const { tokens, dark } = useTheme();
  // Under a split group's hand-off (popup-handoff.tsx) the group's material is the
  // pill the menu takes, the way the reference's whole bar pill vanishes into its menu:
  // it reports its shape (as the bright control puck it reads as) and hides in place,
  // never at a partial opacity, while the pane stands in for it. A selection's puck
  // and a segmented group never have the context and keep the plain tree.
  const handoff = useContext(PopupHandoffContext);
  const report = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) handoff?.report({ radius: shapeRadius(s.glassCorners), width, height, layer: "control" });
  };
  const surface = (
    <GlassSurface
      pointerEvents="none"
      testID={testID}
      interactive={selected}
      tint={selected ? alpha(dark ? tokens.foreground : tokens.background, dark ? 0.16 : 0.64) : undefined}
      style={[
        StyleSheet.absoluteFill,
        s.glassCorners,
        { backgroundColor: selected ? tokens.card : tokens.muted },
        selected ? s.glassSelectionShadow : null,
      ]}
      onLayout={handoff ? report : undefined}
    />
  );
  if (!handoff) return surface;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: handoff.material }]}>{surface}</Animated.View>;
}

/**
 * The selected segment's material: the group's bright puck, a decorative sibling
 * sitting at the measured frame of the selected segment, so the segment's own label,
 * hit target and focus stay in place over it. `pressed` and `disabled` are the shell's
 * call-site props; a static selection reads neither.
 */
export function GlassSelection({ layout, testID }: { layout: LayoutRectangle; pressed?: boolean; disabled?: boolean; testID?: string }) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[s.glassSelectionPosition, { left: layout.x, top: layout.y, width: layout.width, height: layout.height }]}
    >
      <GroupGlass selected testID={testID} />
    </View>
  );
}
