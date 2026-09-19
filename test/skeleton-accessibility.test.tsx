import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Skeleton } from "../src/atoms/skeleton/skeleton.tsx";
import { Skeleton as SkeletonIOS } from "../src/atoms/skeleton/skeleton.ios.tsx";
import { Skeleton as SkeletonAndroid } from "../src/atoms/skeleton/skeleton.android.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";

// Every Skeleton shape announces its loading state exactly once, from its outermost
// node, the way Spinner and Progress do: the single shapes ARE that node, and the
// composite scaffolds (card, list, table) keep the role and label on their wrapper while
// the inner muted blocks sit under an `aria-hidden` subtree of their own. The two must
// never land on the same element: react-native-web forwards only `aria-hidden` (the
// native hide flags are dropped), so a wrapper that hides itself hides the progressbar
// with it and a screen reader never hears that content is loading.

afterEach(cleanup);

// The inner muted blocks each composite scaffold draws: the card's avatar + four lines,
// the list's two rows of avatar + three lines, the table's three rows of four lines.
const COMPOSITES = [
  { name: "card", props: { card: true }, blocks: 5 },
  { name: "list", props: { list: true }, blocks: 8 },
  { name: "table", props: { table: true }, blocks: 12 },
] as const;

const SINGLES = [
  { name: "text", props: {} },
  { name: "avatar", props: { avatar: true } },
  { name: "button", props: { button: true } },
] as const;

/** The elements under `root` that draw a block of their own (no element children). */
const leaves = (root: Element) => Array.from(root.querySelectorAll("*")).filter((el) => el.children.length === 0);

for (const [platform, Component] of [["web", Skeleton], ["ios", SkeletonIOS], ["android", SkeletonAndroid]] as const) {
  describe(`${platform} Skeleton accessibility`, () => {
    for (const { name, props } of SINGLES) {
      it(`${name}: the single shape is the one progressbar, with nothing hidden beneath it`, () => {
        const { getAllByRole, getByRole, container } = render(<ThemeProvider><Component {...props} /></ThemeProvider>);
        expect(getAllByRole("progressbar")).toHaveLength(1);
        const pb = getByRole("progressbar", { name: "Loading" });
        expect(pb.getAttribute("aria-busy")).toBe("true");
        expect(pb.getAttribute("aria-hidden")).toBeNull();
        expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
      });
    }

    for (const { name, props, blocks } of COMPOSITES) {
      it(`${name}: the scaffold announces once from its wrapper and hides its inner blocks`, () => {
        const { getAllByRole, getByRole, container } = render(<ThemeProvider><Component {...props} /></ThemeProvider>);
        // Exactly one progressbar, and it is the outermost node, not hidden from AT.
        expect(getAllByRole("progressbar")).toHaveLength(1);
        const pb = getByRole("progressbar", { name: "Loading" });
        expect(pb.getAttribute("aria-busy")).toBe("true");
        expect(pb.getAttribute("aria-hidden")).toBeNull();
        expect(pb).toBe(container.firstElementChild as HTMLElement);
        // Every inner block sits under an aria-hidden subtree inside the wrapper, and none
        // of them carries a role of its own (the scaffold reads as one node, not N).
        const hidden = pb.querySelector('[aria-hidden="true"]');
        expect(hidden).not.toBeNull();
        expect(leaves(hidden!)).toHaveLength(blocks);
        expect(leaves(pb)).toHaveLength(blocks);
        expect(pb.querySelectorAll("[role]")).toHaveLength(0);
      });

      it(`${name}: a custom accessibilityLabel names the one progressbar (animated too)`, () => {
        const { getAllByRole, getByRole } = render(<ThemeProvider><Component {...props} animate accessibilityLabel="Loading results" /></ThemeProvider>);
        expect(getAllByRole("progressbar")).toHaveLength(1);
        expect(getByRole("progressbar", { name: "Loading results" })).toBeDefined();
      });
    }

    it("card: under glass the material pane adds no second announcement", () => {
      const { getAllByRole, getByRole } = render(<ThemeProvider glass><Component card /></ThemeProvider>);
      expect(getAllByRole("progressbar")).toHaveLength(1);
      const pb = getByRole("progressbar", { name: "Loading" });
      expect(pb.getAttribute("aria-hidden")).toBeNull();
      expect(pb.querySelectorAll("[role]")).toHaveLength(0);
    });
  });
}
