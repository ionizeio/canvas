import { useEffect } from "react";
import { Platform } from "react-native";
import { useTheme } from "@ionizeio/canvas";

// The classic (space-reserving) scrollbar width forced on web. The topbar is inset by
// this on the right so the scrollbar sits in a gutter BESIDE the bar (fully visible
// from the top), matching the previous web docs, instead of running underneath it.
export const SCROLLBAR_W = 10;

// Web-only. Native platforms have no persistent scrollbar to style, so there is no
// cross-platform primitive for this; the browser scrollbar is the one place the docs
// must reach the DOM. This writes a single <style> tag and rewrites it when the scheme
// changes, mirroring the previous web docs scrollbar exactly: a thin, rounded thumb tinted with
// the `border` token, brightening to `muted-foreground` on hover, over a transparent
// track. Renders nothing and is a no-op off the web.
export function WebScrollbarTheme() {
  const { tokens } = useTheme();
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const thumb = tokens.border;
    const thumbHover = tokens["muted-foreground"];
    const css = `
*{ scrollbar-width: thin; scrollbar-color: ${thumb} transparent; }
::-webkit-scrollbar { width: ${SCROLLBAR_W}px; height: ${SCROLLBAR_W}px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-corner { background: transparent; }
::-webkit-scrollbar-thumb { background-color: ${thumb}; border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box; }
::-webkit-scrollbar-thumb:hover { background-color: ${thumbHover}; background-clip: padding-box; }
/* Inside a component preview stage, hide the persistent browser scrollbar a scrollable
   demo would otherwise show — iOS/Android use a transient indicator, not a fixed bar, so a
   visible bar reads as wrong in the iOS/Android preview columns. The demo still scrolls. */
[data-preview-stage] ::-webkit-scrollbar { display: none; }
[data-preview-stage], [data-preview-stage] * { scrollbar-width: none; }
`;
    let el = document.getElementById("docs-scrollbar-theme") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "docs-scrollbar-theme";
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [tokens]);
  return null;
}
