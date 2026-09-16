import { type ReactNode } from "react";
import { View, Text, Pressable, Icon, Row, Column, Grid, GridItem, useTheme, alpha } from "@ionizeio/canvas";
import { useRouter } from "expo-router";
import { sans } from "../ui/fonts";

// One entry in the component catalog: a title, the route it links to, an optional double-width
// flag, and a Preview component (a small hand-authored mockup of the component, rendered in the
// tile's 16:9 stage).
export type CatTile = { title: string; href: string; span?: boolean; Preview: () => ReactNode };

// A single catalog tile: a card with a centered 16:9 preview stage over a muted wash, and a
// footer with the title and a chevron. Sized by the Grid cell it sits in.
export function Tile({ tile }: { tile: CatTile }) {
  const { tokens } = useTheme();
  const router = useRouter();
  const Preview = tile.Preview;
  return (
    <Pressable
      onPress={() => router.push(tile.href as never)}
      style={{
        width: "100%",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: tokens.border,
        backgroundColor: tokens.card,
        overflow: "hidden",
      }}
    >
      <Column
        flush
        center
        alignCenter
        pad
        style={{
          aspectRatio: 16 / 9,
          backgroundColor: alpha(tokens.muted, 0.3),
          borderBottomWidth: 1,
          borderColor: tokens.border,
          overflow: "hidden",
        }}
      >
        <Preview />
      </Column>
      <Row flush between alignCenter style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
        <Text style={{ fontFamily: sans("500"), fontSize: 12.5, color: tokens.foreground }}>{tile.title}</Text>
        <Icon chevronRight size={12} muted />
      </Row>
    </Pressable>
  );
}

// The responsive tile grid: the kit Grid's container-measured auto-fit (as many 220px-floor
// tiles as fit, capped at 3 columns, cozy 12px gap; it owns the viewport seed for the first
// paint). A `span` tile takes two cells via GridItem `wide` (used by Data Tables).
export function CatGrid({ tiles }: { tiles: CatTile[] }) {
  return (
    <Grid minTileWidth={220} columns={3} cozy>
      {tiles.map((t) =>
        t.span ? (
          <GridItem wide key={t.href}>
            <Tile tile={t} />
          </GridItem>
        ) : (
          <Tile key={t.href} tile={t} />
        ),
      )}
    </Grid>
  );
}

// A category section: heading + "N components" count, then the tile grid.
export function CatGroup({ label, count, tiles }: { label: string; count: number; tiles: CatTile[] }) {
  const { tokens } = useTheme();
  return (
    <Column cozy>
      <Row flush between baseline>
        <Text accessibilityRole="header" aria-level={2} style={{ fontFamily: sans("600"), fontSize: 18, letterSpacing: -0.18, color: tokens.foreground }}>{label}</Text>
        <Text style={{ fontFamily: sans("500"), fontSize: 11, letterSpacing: 0.88, textTransform: "uppercase", color: tokens["muted-foreground"] }}>
          {count} components
        </Text>
      </Row>
      <CatGrid tiles={tiles} />
    </Column>
  );
}

// The category pill bar with the total component count. Stays a raw View: its 6px
// gap sits between the tight (4) and snug (8) steps, so no Row gap prop reproduces
// it and converting would move pixels.
export function CatSubBar({ categories, total }: { categories: string[]; total: number }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        paddingBottom: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderColor: tokens.border,
      }}
    >
      {categories.map((c) => (
        <View
          key={c}
          style={{
            paddingVertical: 4,
            paddingHorizontal: 12,
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: tokens.border,
            backgroundColor: tokens.card,
          }}
        >
          <Text style={{ fontFamily: sans("500"), fontSize: 12, color: tokens.foreground }}>{c}</Text>
        </View>
      ))}
      <View style={{ flex: 1, minWidth: 12 }} />
      <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["muted-foreground"] }}>{total} components</Text>
    </View>
  );
}

// Shared mini-mockup helpers used by the per-category preview files, rebuilding the common docs
// elements (button, input, badge, avatar, ...) as small RN nodes.
export function MiniBtn({ label, variant = "default" }: { label: string; variant?: "default" | "outline" | "ghost" }) {
  const { tokens } = useTheme();
  const bg = variant === "default" ? tokens.primary : variant === "outline" ? tokens.background : "transparent";
  const fg = variant === "default" ? tokens["primary-foreground"] : tokens.foreground;
  const border = variant === "outline" ? tokens.input : "transparent";
  return (
    <View style={{ height: 28, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: sans("500"), fontSize: 11, color: fg }}>{label}</Text>
    </View>
  );
}

export function MiniInput({ placeholder, value, width = 170 }: { placeholder?: string; value?: string; width?: number }) {
  const { tokens } = useTheme();
  return (
    <View style={{ height: 32, width, maxWidth: "100%", borderRadius: 10, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background, paddingHorizontal: 10, justifyContent: "center" }}>
      <Text style={{ fontFamily: sans("400"), fontSize: 12, color: value ? tokens.foreground : tokens["muted-foreground"] }} numberOfLines={1}>
        {value ?? placeholder}
      </Text>
    </View>
  );
}

// An avatar disc with initials. Brand gradients are kept simple here with a solid brand-tinted
// fill so it reads at tile size on every platform.
export function MiniAvatar({ initials, size = 32, color, ring }: { initials: string; size?: number; color?: string; ring?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? tokens.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: ring ? 2 : 0,
        borderColor: tokens.background,
      }}
    >
      <Text style={{ fontFamily: sans("600"), fontSize: size * 0.34, color: "#ffffff" }}>{initials}</Text>
    </View>
  );
}

// A labelled content row used by several previews.
export function previewWrap(children: ReactNode): ReactNode {
  return <Column flush center alignCenter style={{ width: "100%" }}>{children}</Column>;
}
