import { useContext } from "react";
import { Animated, StyleSheet, type LayoutChangeEvent, type LayoutRectangle } from "react-native";
import { GlassSurface, alpha, useTheme } from "../../style/index.js";
import { MeasuredSelection } from "../../style/measured-selection.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
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
 * The selection travels and deforms independently: it stretches into a droplet
 * in flight, then recoils across its resting shape as it lands. The shared
 * decorative frame leaves native material ancestors free of scale and opacity.
 */
export function GlassSelection({ layout, pressed = false, disabled, testID }: { layout: LayoutRectangle; pressed?: boolean; disabled?: boolean; testID?: string }) {
  const theme = useMaterialTheme({ layer: "functional" });
  return (
    <MeasuredSelection layout={layout} enabled={theme.surface === "glass" && !disabled} pressed={pressed}>
      <GroupGlass selected testID={testID} />
    </MeasuredSelection>
  );
}
