import { StyleSheet, type LayoutRectangle } from "react-native";
import { GlassSurface, alpha, useTheme } from "../../style/index.js";
import { MeasuredSelection } from "../../style/measured-selection.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
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
