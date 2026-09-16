import { Platform } from "react-native";
import { Slot, Stack } from "expo-router";
import { useTheme } from "@ionizeio/canvas";

// The one adaptive per-tab layout. On the web it returns a bare <Slot/> so the root
// WebNav shell owns the chrome. On native it is a native Stack whose header is the real
// system navigation bar (matching the native tab bar). A regular (not large) left title
// reads like the web breadcrumb above each page's own H1, so there is no duplicate-title
// and no per-page surgery. Per-screen title / search / menu are set by <NativeHeader/>
// inside each screen.
//
// iOS 26: headerTransparent so content scrolls behind the bar (the condition for the system
// to paint Liquid Glass); the screen scrollers add contentInsetAdjustmentBehavior="automatic"
// so iOS owns the inset. Android has no such auto-inset, so it uses a solid Material top app
// bar (themed to match) that occupies its own space, and the content sits below it.
//
// contentStyle paints the themed page backdrop behind every native screen. The screens
// render TRANSPARENT in glass mode (so a single backdrop shows through, mirroring how the
// web shell's SafeAreaView owns the fill), so without this the native screen container
// would fall back to its system-default (light) background — making the app look light in
// dark mode and frosting the Liquid Glass bars over white. Tied to tokens.background, the
// backdrop follows the OS light/dark scheme, and the bars frost over the right color.
//
// It stays OPAQUE on purpose. The backdrop is hosted inside ScreenFrame on native (see
// native-header.tsx), so its surface paints within the screen, above this fill. Making
// this transparent instead — to let a root-level host show through — does not work: the
// native tab controller and stack navigator each paint their own background underneath,
// so the screen just falls back to system light.
export function TabShell({ section: _section }: { section: "home" | "components" | "utilities" | "search" }) {
  const { tokens } = useTheme();
  if (Platform.OS === "web") return <Slot />;
  const ios = Platform.OS === "ios";
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: ios,
        headerTitleAlign: "left",
        contentStyle: { backgroundColor: tokens.background },
        ...(ios
          ? {}
          : {
              headerStyle: { backgroundColor: tokens.background },
              headerTintColor: tokens.foreground,
              headerShadowVisible: false,
            }),
      }}
    />
  );
}
