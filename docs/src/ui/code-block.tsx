import { CodeBlock as KitCodeBlock } from "@ionizeio/canvas";

// The docs' code panel IS the kit CodeBlock (dogfooding). The hand-rolled
// TSX highlighter + copy chip that used to live here were absorbed into the kit
// component, which now tokenizes cross-platform, scrolls long lines, and writes
// the clipboard itself (navigator.clipboard on web, expo-clipboard natively).
// This adapter only pins the docs-wide defaults: compact density, the TSX
// grammar, a copy chip, and the attached top edge when a panel sits flush under
// the preview stage.
export function CodeBlock({
  code,
  flush,
  wrap,
  language = "tsx",
}: {
  code: string;
  flush?: boolean;
  /** Soft-wrap long lines instead of scrolling them (the kit CodeBlock's `wrap`).
   *  For short teaching snippets (the Do/Don't cards), where a scrolled-away tail
   *  defeats the point on a phone. */
  wrap?: boolean;
  language?: string;
}) {
  return <KitCodeBlock code={code} language={language} compact copy attached={flush} wrap={wrap} />;
}
