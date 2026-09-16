import { Link } from "expo-router";
import { Column, Text, useTheme } from "@ionizeio/canvas";
import { Page } from "../../ui/page";

export default function NotFound() {
  const { tokens } = useTheme();
  return (
    <Page>
      <Column cozy alignStart style={{ paddingVertical: 40 }}>
        <Text accessibilityRole="header" aria-level={1} style={{ fontSize: 24, fontWeight: "700", color: tokens.foreground }}>Page not found</Text>
        <Text style={{ fontSize: 14, color: tokens["muted-foreground"] }}>That page doesn’t exist.</Text>
        <Link href="/" style={{ color: tokens.primary, fontSize: 14, fontWeight: "600" }}>
          ← Back to home
        </Link>
      </Column>
    </Page>
  );
}
