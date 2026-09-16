import { type ReactNode } from "react";
import { Platform } from "react-native";
import { ScrollView, View, OverlayProvider, useTheme } from "@ionizeio/canvas";
import { CONTENT_TOP_INSET } from "../shell/topbar";
import { ScreenFrame } from "../shell/native-header";
import { H1, Lead } from "./prose";

// The standard scrollable content frame, mirroring `.app-content` (max-width 1400,
// the 24/28/80 padding, centered). ScreenFrame adds the native header + search overlay
// on iOS/Android and is a transparent passthrough on web.
//
// The OverlayProvider is the page-level overlay host: anchored overlays opened
// anywhere in the page body (a Dropdown in a Do/Don't card, a Select in a template
// preview) portal into its outlet, so they paint ABOVE later page content and
// overflow their card instead of being clipped by it or painted under a sibling
// (every react-native-web View is its own stacking context, so an inline menu can
// never z-lift past its card's later siblings). It sits INSIDE the scroll content,
// so portaled cards scroll with the page and stay glued to their triggers.
// Playground stages mount their own nearer host and stay stage-contained.
export function Page({ children }: { children: ReactNode }) {
  const { tokens, surface } = useTheme();
  return (
    <ScreenFrame>
      <ScrollView
        // Marks the page's scroller for tooling. The docs scroll in an INNER view, not
        // the window, so a check for "does this page scroll sideways" has to ask this
        // node and not the document. Web-only attribute; a no-op on native.
        {...(Platform.OS === "web" ? ({ dataSet: { pageScroll: "" } } as object) : null)}
        style={{ flex: 1, backgroundColor: surface === "glass" ? "transparent" : tokens.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          // Web: clear the absolute Topbar overlay (CONTENT_TOP_INSET = 56). Native: iOS
          // owns the inset via contentInsetAdjustmentBehavior, so we add 0 and let content
          // sit under the transparent nav bar.
          paddingTop: CONTENT_TOP_INSET + 24,
          paddingHorizontal: 28,
          paddingBottom: 80,
          width: "100%",
          maxWidth: 1400,
          alignSelf: "center",
        }}
      >
        {/* The longhands override the provider's app-root default (flex: 1) so the
            box wraps its content: react-native-web expands `flex: 0` to basis 0%,
            which collapses a content-sized scroll child to 0 height, so basis is
            set to auto explicitly. The column gap moves here from the content
            container, which now has one child. */}
        <OverlayProvider style={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto", gap: 28 }}>{children}</OverlayProvider>
      </ScrollView>
    </ScreenFrame>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <H1>{title}</H1>
      {description ? <Lead>{description}</Lead> : null}
    </View>
  );
}
