import { View, Row, Column, Button, useTheme } from "@ionizeio/canvas";
import { usePathname, useRouter } from "expo-router";
import { FLAT_PAGES, getActiveSlug } from "../data/nav";

// Prev / next links at the foot of each content page, following the nav order.
export function PageNav() {
  const { tokens } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  // Match by active slug, not exact href, so a component page's /<variant> deep link still
  // resolves to its place in the nav order for prev/next.
  const active = getActiveSlug(pathname);
  const idx = FLAT_PAGES.findIndex((p) => p.slug === active);
  if (idx === -1) return null;
  const prev = idx > 0 ? FLAT_PAGES[idx - 1] : undefined;
  const next = idx < FLAT_PAGES.length - 1 ? FLAT_PAGES[idx + 1] : undefined;

  return (
    <Row
      between
      cozy
      style={{
        marginTop: 12,
        paddingTop: 18,
        borderTopWidth: 1,
        borderColor: tokens.border,
      }}
    >
      {prev ? (
        <Column shrink>
          <Button link small onPress={() => router.push(prev.href as never)}>
            ← {prev.label}
          </Button>
        </Column>
      ) : (
        <View />
      )}
      {next ? (
        <Column shrink>
          <Button link small onPress={() => router.push(next.href as never)}>
            {next.label} →
          </Button>
        </Column>
      ) : (
        <View />
      )}
    </Row>
  );
}
