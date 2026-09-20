import { type ReactNode } from "react";
import { Column, OverlayProvider, ScrollView, View } from "@nannier-com/canvas";

// App-frame scaffolding owns the scroll viewport and readable page measure.
// Page content uses Canvas layout props for all spacing and arrangement.
// The ordinary app compiles against the registry release it pins, so this frame
// uses only published APIs. A smoke route whose overlays belong to an enclosing
// viewport-measured host (a candidate API) wraps the frame and asks for a plain
// content box instead of the page's own overlay host.
export function Screen({ children, viewportOverlays = false }: { children: ReactNode; viewportOverlays?: boolean }) {
  // Viewport modals must not center inside the page's full scroll content.
  // Ordinary pages retain their content host for anchored menus.
  const ContentHost = viewportOverlays ? View : OverlayProvider;
  return (
    <ScrollView role="main" keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
      <Column padLoose alignCenter>
        <ContentHost style={{ width: "100%", maxWidth: 1120, flexGrow: 0, flexShrink: 0, flexBasis: "auto" }}>
          <Column loose>{children}</Column>
        </ContentHost>
      </Column>
    </ScrollView>
  );
}
