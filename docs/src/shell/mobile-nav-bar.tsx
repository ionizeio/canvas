import { type ReactNode } from "react";
import { Text, Pressable, Row, Column, Icon, GlassSurface, useTheme, alpha } from "@ionizeio/canvas";
import { sans } from "../ui/fonts";

// The mobile-web top bar, built to match the iOS UINavigationBar: a centered title flanked by
// circular Liquid-Glass-style buttons — a back chevron on the left (on pushed pages) and the
// category-menu button on the right (search lives in the bottom tab bar). It renders through
// GlassSurface like the native nav bar, so it frosts in glass mode and is solid otherwise. This
// is docs nav chrome (the authorized platform branch), composed from kit primitives, mirroring
// the native iOS header.

const BAR_HEIGHT = 52;
// Equal side cells keep the title centered across the whole bar regardless of how many
// buttons each side holds, exactly as iOS centers its title.
const SIDE = 90;

function CircleButton({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: alpha(tokens.foreground, 0.06),
        },
        pressed ? { opacity: 0.55 } : null,
      ]}
    >
      {icon}
    </Pressable>
  );
}

export function MobileNavBar({
  title,
  showBack,
  onBack,
  onMenu,
}: {
  title: string;
  showBack: boolean;
  onBack: () => void;
  onMenu: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <GlassSurface role="banner" style={{ height: BAR_HEIGHT, borderBottomWidth: 1, borderColor: tokens.border, backgroundColor: tokens.background }}>
      <Row flush fill alignCenter style={{ paddingHorizontal: 12 }}>
        <Column flush alignStart style={{ width: SIDE }}>
          {showBack ? <CircleButton label="Back" onPress={onBack} icon={<Icon chevronLeft size={20} />} /> : null}
        </Column>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", fontFamily: sans("600"), fontSize: 17, color: tokens.foreground }}>
          {title}
        </Text>
        <Row snug end alignCenter style={{ width: SIDE }}>
          <CircleButton label="Menu" onPress={onMenu} icon={<Icon menu size={18} />} />
        </Row>
      </Row>
    </GlassSurface>
  );
}
