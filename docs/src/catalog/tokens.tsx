import { View, Text, useTheme, alpha, Row, Container } from "@ionizeio/canvas";
import { sans, geistMono } from "../ui/fonts";
import type { CatTile } from "./tile";

// ── Tokens previews ──────────────────────────────────────────────────────────
// Hand-authored mini-mockups for the Tokens category.

function ColorsPreview() {
  const { tokens } = useTheme();
  const swatches = [
    tokens.primary, tokens.card, tokens.muted, tokens.accent, tokens.foreground, tokens.destructive,
    tokens.secondary, tokens.popover, tokens.background, tokens.ring, tokens.input, tokens.border,
  ];
  return (
    <Container xxxs start>
      <Row tight wrap>
        {swatches.map((c, i) => (
          <View key={i} style={{ width: 33, height: 28, borderRadius: 6, backgroundColor: c, borderWidth: 1, borderColor: tokens.border }} />
        ))}
      </Row>
    </Container>
  );
}

function SpacingPreview() {
  const { tokens } = useTheme();
  return (
    <Row tight alignEnd>
      {[12, 16, 20, 24, 28].map((n) => (
        <View key={n} style={{ width: n, height: n, borderRadius: 10, backgroundColor: alpha(tokens.primary, 0.25), borderWidth: 1, borderColor: alpha(tokens.primary, 0.4) }} />
      ))}
    </Row>
  );
}

function TypographyPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: "flex-start", gap: 2 }}>
      <Text style={{ fontFamily: sans("700"), fontSize: 24, letterSpacing: -0.48, lineHeight: 24, color: tokens.foreground }}>Aa</Text>
      <Text style={{ fontFamily: geistMono("400"), fontSize: 11, lineHeight: 13, color: tokens.foreground }}>Geist Mono</Text>
    </View>
  );
}

export const TOKENS_TILES: CatTile[] = [
  { title: "Colors & Theme", href: "/tokens/colors", Preview: ColorsPreview },
  { title: "Spacing & Shape", href: "/tokens/spacing", Preview: SpacingPreview },
  { title: "Typography", href: "/tokens/typography", Preview: TypographyPreview },
];
