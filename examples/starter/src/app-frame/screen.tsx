import { type ReactNode } from "react";
import { Column, OverlayProvider, ScrollView, View } from "@nannier-com/canvas";

// App-frame scaffolding owns the scroll viewport and readable page measure.
// Page content uses Canvas layout props for all spacing and arrangement.
export function Screen({ children, viewportOverlays = false }: { children: ReactNode; viewportOverlays?: boolean }) {
  // Viewport modals must not center inside the page's full scroll content.
  // Ordinary pages retain their content host for anchored menus.
  const ContentHost = viewportOverlays ? View : OverlayProvider;
  const content = (
    <ScrollView role="main" keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
      <Column padLoose alignCenter>
        <ContentHost style={{ width: "100%", maxWidth: 1120, flexGrow: 0, flexShrink: 0, flexBasis: "auto" }}>
          <Column loose>{children}</Column>
        </ContentHost>
      </Column>
    </ScrollView>
  );
  return viewportOverlays ? <OverlayProvider viewport>{content}</OverlayProvider> : content;
}
