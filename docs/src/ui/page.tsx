import { type ReactNode } from "react";
import { Platform } from "react-native";
import { ScrollView, View, OverlayProvider, useTheme } from "@ionizeio/canvas";
import { CONTENT_TOP_INSET, CONTENT_BOTTOM_INSET } from "../shell/topbar";
import { ScreenFrame } from "../shell/native-header";
import { H1, Lead } from "./prose";
import { DocsHead } from "./docs-head";

// The standard scrollable content frame, mirroring `.app-content` (max-width 1400,
// the 24/28/80 padding, centered). ScreenFrame adds the native header + search overlay
// on iOS/Android and is a transparent passthrough on web.
//
// The OverlayProvider is the page-level overlay host: overlays opened anywhere in
// the page body (a Dropdown in a Do/Don't card, a Select in a template preview) are
// placed by its outlet, so they paint ABOVE later page content and overflow their
// card instead of being clipped by it or painted under a sibling (every
// react-native-web View is its own stacking context, so an inline menu can never
// z-lift past its card's later siblings). It sits INSIDE the scroll content, so a
// card pinned open for a demo scrolls with the page and stays glued to its trigger.
// A card that closes on an outside tap paints in the app root's outlet instead,
// placed exactly where this one would put it, so its backdrop spans the window and
// holds the page still while it is open. Playground stages mount their own nearer
// host and place their overlays within the stage the same way.
export function Page({ children, viewportOverlays = false }: { children: ReactNode; viewportOverlays?: boolean }) {
  const { tokens } = useTheme();
  // Runtime fixtures need viewport modals and a sibling capture plane. Keep the
  // catalogue's content host by default so anchored previews scroll as before.
  const ContentHost = viewportOverlays ? View : OverlayProvider;
  const content = (
      <ScrollView
        // Marks the page's scroller for tooling. The docs scroll in an INNER view, not
        // the window, so a check for "does this page scroll sideways" has to ask this
        // node and not the document. Web-only attribute; a no-op on native.
        {...(Platform.OS === "web" ? ({ dataSet: { pageScroll: "" } } as object) : null)}
        style={{ flex: 1, backgroundColor: tokens.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          // Web: clear the absolute Topbar overlay (CONTENT_TOP_INSET = 56). Native: iOS
          // owns the inset via contentInsetAdjustmentBehavior, so we add 0 and let content
          // sit under the transparent nav bar.
          paddingTop: CONTENT_TOP_INSET + 24,
          paddingHorizontal: 28,
          paddingBottom: Math.max(80, CONTENT_BOTTOM_INSET + 24),
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
        <ContentHost style={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto", gap: 28 }}>{children}</ContentHost>
      </ScrollView>
  );
  return (
    <ScreenFrame>
      {viewportOverlays ? <OverlayProvider viewport>{content}</OverlayProvider> : content}
    </ScreenFrame>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <DocsHead title={title} />
      <H1>{title}</H1>
      {description ? <Lead>{description}</Lead> : null}
    </View>
  );
}
