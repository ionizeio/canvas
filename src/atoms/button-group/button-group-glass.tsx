import { StyleSheet, type LayoutRectangle } from "react-native";
import { GlassSurface, View, alpha, useTheme } from "../../style/index.js";
import * as s from "./button-group.styles.js";

/** A material sibling behind the controls, so it never clips focus or intercepts taps. */
export function GroupGlass({ selected = false, testID }: { selected?: boolean; testID?: string }) {
  const { tokens, dark } = useTheme();
  return (
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
    />
  );
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
