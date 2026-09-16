import { View, Text, Row, Icon, Button, ButtonGroup, useTheme, liquidGlassAvailable } from "@nannier-com/canvas";
import { useDocsTheme } from "../theme/docs-theme";
import { sans } from "../ui/fonts";

// The scheme + surface toggles, shown always-visible in the native Android AND iOS top bars
// (`compact`, placed beside the hamburger) and in the mobile web drill-down sheet's footer
// (labeled). The compact form always offers the Solid/Glass toggle (both looks are worth
// switching between even where glass is the OS default); the labeled form only shows it where
// glass is opt-in. The label names the surface MODE, not the material a given platform
// happens to paint for it (Liquid Glass, a lens, or a frost).
export function ThemeToggles({ compact = false }: { compact?: boolean }) {
  const { tokens } = useTheme();
  const { scheme, surface, toggleScheme, setSurface } = useDocsTheme();
  const glassAvailable = !liquidGlassAvailable();

  const schemeToggle = (
    <Button
      ghost
      icon
      small
      accessibilityLabel="Toggle color scheme"
      iconLeft={scheme === "dark" ? <Icon sun size={16} /> : <Icon moon size={16} />}
      onPress={toggleScheme}
    />
  );

  // Compact form (the native Android top app bar): icon-only controls so the app-bar
  // title keeps its room. The surface toggle is a single layers icon that flips
  // Solid<->Glass, tinted primary when glass is on and muted when solid so its state
  // reads at a glance; the scheme is the shared sun/moon icon. (The wide labeled
  // Solid/Glass segmented control is kept for the roomier surfaces below.)
  if (compact) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <Button
          ghost
          icon
          small
          accessibilityLabel={surface === "glass" ? "Glass surface on; tap for solid" : "Solid surface; tap for glass"}
          iconLeft={surface === "glass" ? <Icon layers size={16} primary /> : <Icon layers size={16} muted />}
          onPress={() => setSurface(surface === "glass" ? "solid" : "glass")}
        />
        {schemeToggle}
      </View>
    );
  }

  return (
    <>
      <Text style={{ fontFamily: sans("500"), fontSize: 13, color: tokens["muted-foreground"] }}>Appearance</Text>
      <Row snug alignCenter>
        {glassAvailable ? (
          <ButtonGroup
            segmented
            small
            accessibilityLabel="Surface"
            items={["Solid", "Glass"]}
            active={surface === "solid" ? 0 : 1}
            onSelect={(i) => setSurface(i === 0 ? "solid" : "glass")}
          />
        ) : null}
        {schemeToggle}
      </Row>
    </>
  );
}
