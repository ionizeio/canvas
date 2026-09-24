import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Avatar, AvatarGroup, AvatarMenu } from "../src/atoms/avatar/avatar.tsx";
import type { AvatarMenuProps } from "../src/atoms/avatar/avatar.tsx";
import { webMenuSkin, iosMenuSkin, androidMenuSkin, webSkin, iosSkin, androidSkin } from "../src/atoms/avatar/avatar.styles.ts";
import type { AvatarMenuSkin } from "../src/atoms/avatar/avatar-menu.shared.tsx";
import {
  webSkin as webMenuSurface,
  iosSkin as iosMenuSurface,
  androidSkin as androidMenuSurface,
} from "../src/atoms/dropdown/dropdown.styles.ts";
import { OverlayProvider } from "../src/style/portal.tsx";
import { lightColors, darkColors } from "../src/style/tokens.ts";
import { contrastRatio } from "../src/style/color.ts";
import type { DropdownItem } from "../src/atoms/dropdown/dropdown.tsx";

// AvatarMenu: the account identity pill (avatar + name/email + chevron) wired to
// the kit's Dropdown. These lock the anatomy (one capsule trigger, no nested
// pressable), the controlled/uncontrolled open duality, the pass-through of the
// menu's identity header, and the accessible name that tells a screen reader
// WHOSE account the button opens.

afterEach(cleanup);
const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);

const ITEMS: DropdownItem[] = [
  { label: "Profile", icon: "user" },
  { label: "Settings", icon: "settings", shortcut: "⌘," },
  { label: "Sign out", icon: "logOut", destructive: true, separatorBefore: true },
];

const NAME = "Rachel Chen";
const EMAIL = "rachel@example.com";
const LABEL = `${NAME}, ${EMAIL}`;

const trigger = (c: HTMLElement) => c.querySelector('[aria-haspopup="menu"]') as HTMLElement;
const at = (c: HTMLElement, id: string) => c.querySelector(`[data-testid="${id}"]`) as HTMLElement;
// The capsule itself: Dropdown's button wraps it, and it is that button's only
// child (there is deliberately no second Pressable inside).
const pill = (c: HTMLElement) => trigger(c).firstElementChild as HTMLElement;
// The chevron's rotating wrapper, the capsule's trailing child. react-native-svg
// is stubbed in the harness, so the glyph inside it renders as an empty
// aria-hidden node and the rotation is all that is observable here.
const chevron = (c: HTMLElement) => pill(c).lastElementChild as HTMLElement;

// The open card's positioned wrapper, on EITHER overlay path: walk up from the
// menu to the first absolutely positioned ancestor and read back the physical
// edge react-native-web resolved the logical inset to. Inline that wrapper is the
// card's own start/end anchor; hosted it is the portal's placement inside the
// outlet (the outlet's own `position: absolute` rides a CSS class rather than the
// inline style, so the walk stops on the card).
const anchorOf = (c: HTMLElement) => {
  let node = c.querySelector('[role="menu"]')!.parentElement;
  while (node && node.style.position !== "absolute") node = node.parentElement;
  return node!.style;
};

// react-native-web writes every colour into the DOM as `rgba(r, g, b, a.aa)`, so
// put the skin's own hex / rgb() / rgba() / transparent value into that one shape
// before comparing the two.
const asRgba = (color: string): string => {
  if (color === "transparent") return "rgba(0, 0, 0, 0.00)";
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (hex) return `rgba(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(hex[3], 16)}, 1.00)`;
  const fn = /^rgba?\(([^)]+)\)$/.exec(color);
  if (fn) {
    const [r, g, b, a = "1"] = fn[1].split(",").map((p) => p.trim());
    return `rgba(${r}, ${g}, ${b}, ${Number(a).toFixed(2)})`;
  }
  return color;
};

// The three platform builds of the pill, each with the skin it was built from.
// Under bun there is no .ios/.android extension resolution, so each build is
// imported by its explicit filename.
const PLATFORM_MENUS: { name: string; file: string; skin: AvatarMenuSkin }[] = [
  { name: "web", file: "avatar", skin: webMenuSkin },
  { name: "iOS", file: "avatar.ios", skin: iosMenuSkin },
  { name: "Android", file: "avatar.android", skin: androidMenuSkin },
];
const loadMenu = async (file: string) =>
  ((await import(`../src/atoms/avatar/${file}.tsx`)) as { AvatarMenu: (p: AvatarMenuProps) => ReactNode }).AvatarMenu;

// The HOSTED (portaled) overlay path holds its card back until the trigger
// measures a non-zero box, and happy-dom reports every box as 0x0, so a hosted
// card never mounts in a test unless the layout is stubbed. These give the DOM a
// real box for the duration of a case. Hosted assertions wait for the actual
// menu and positioned wrapper after the asynchronous measurements complete.
const LAID_OUT = { x: 10, y: 20, width: 160, height: 32, top: 20, left: 10, right: 170, bottom: 52, toJSON: () => ({}) } as DOMRect;
const withLayout = async (run: () => Promise<void>) => {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = () => LAID_OUT;
  try {
    await run();
  } finally {
    Element.prototype.getBoundingClientRect = original;
  }
};

// The disc the capsule is drawn around: Avatar's `tiny` step, the size the web
// hand-off puts inside its identity pill.
const DISC = 24;

describe("AvatarMenu pill", () => {
  it("renders the name over the email inside one capsule trigger", () => {
    const { container } = ui(<AvatarMenu name={NAME} email={EMAIL} items={ITEMS} />);
    expect(screen.getByText(NAME)).toBeDefined();
    expect(screen.getByText(EMAIL)).toBeDefined();
    // The initials fallback comes from the same Avatar the kit exports.
    expect(screen.getByText("RC")).toBeDefined();
    // One trigger only: the capsule is Dropdown's children, so there is exactly
    // one button and nothing pressable nested inside it.
    expect(container.querySelectorAll("button").length).toBe(1);
  });

  it("compact drops the identity column but keeps the avatar and the account name", () => {
    const { container } = ui(<AvatarMenu compact name={NAME} email={EMAIL} items={ITEMS} />);
    expect(screen.queryByText(NAME)).toBeNull();
    expect(screen.queryByText(EMAIL)).toBeNull();
    expect(screen.getByText("RC")).toBeDefined();
    expect(trigger(container).getAttribute("aria-label")).toBe(LABEL);
  });

  // The name has to sit on the BUTTON, not merely somewhere in the subtree: a
  // button with no name of its own is named from its contents, which reads the
  // pill's two text lines back to back with no punctuation ("Rachel
  // Chenrachel@example.com") and repeats the Avatar's own label after it.
  it("carries a data-carrying accessible name ON THE TRIGGER, falling back when there is no email", () => {
    const { container } = ui(<AvatarMenu name={NAME} email={EMAIL} items={ITEMS} />);
    expect(trigger(container).getAttribute("aria-label")).toBe(LABEL);
    cleanup();

    const noEmail = ui(<AvatarMenu name={NAME} items={ITEMS} />).container;
    expect(trigger(noEmail).getAttribute("aria-label")).toBe(NAME);
    cleanup();

    const bare = ui(<AvatarMenu items={ITEMS} />).container;
    expect(trigger(bare).getAttribute("aria-label")).toBe("Account menu");
  });

  // The capsule's disc is the kit's own Avatar, so it has to receive the account's
  // photo and its ready-made initials; dropping either prop from the inner Avatar
  // would leave the pill showing name-derived initials for an account that has a
  // photo.
  it("hands src and initials down to the capsule's own Avatar", () => {
    const photo = ui(
      <AvatarMenu name={NAME} email={EMAIL} src="https://example.com/rachel.png" items={ITEMS} />,
    ).container;
    const img = photo.querySelector("img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toBe("https://example.com/rachel.png");
    // The photo is alt-texted from the account name, exactly like a plain Avatar.
    expect(img.getAttribute("alt")).toBe(NAME);
    // ...and the initials fallback is gone, so the two never stack.
    expect(screen.queryByText("RC")).toBeNull();
    cleanup();

    // Ready-made initials are used verbatim, outranking the pair derived from name.
    ui(<AvatarMenu name={NAME} email={EMAIL} initials="RCX" items={ITEMS} />);
    expect(screen.getByText("RCX")).toBeDefined();
    expect(screen.queryByText("RC")).toBeNull();
  });

  // The chevron repeats the button's own state, so it must actually flip: a glyph
  // frozen pointing down says "closed" over an open menu.
  it("keeps the chevron still and fills the pill while the menu is open, never while disabled", () => {
    const closed = ui(<AvatarMenu name={NAME} email={EMAIL} items={ITEMS} />).container;
    expect(chevron(closed).style.transform).toBe("");
    expect(pill(closed).style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
    cleanup();

    const open = ui(<AvatarMenu open name={NAME} email={EMAIL} items={ITEMS} />).container;
    expect(chevron(open).style.transform).toBe("");
    expect(pill(open).style.backgroundColor).toBe(asRgba(lightColors.accent));
    cleanup();

    // A disabled pill can never read as open, so it stays bare even when `open` is
    // forced, matching the collapsed aria-expanded.
    const inert = ui(<AvatarMenu open disabled name={NAME} email={EMAIL} items={ITEMS} />).container;
    expect(pill(inert).style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
    expect(trigger(inert).getAttribute("aria-expanded")).toBe("false");
  });

  it("forwards testID and outer layout placement to the control's root", () => {
    const { container } = ui(
      <AvatarMenu testID="account" name={NAME} email={EMAIL} items={ITEMS} style={{ alignSelf: "flex-end" }} />,
    );
    const root = at(container, "account");
    expect(root).not.toBeNull();
    // The E2E hook names the whole control, trigger included, not some inner node.
    expect(root.contains(trigger(container))).toBe(true);
    // `style` is outer layout composition only (placement within a parent) and it
    // composes LAST, so the caller's placement wins over the wrapper's own
    // self-start default rather than being dropped.
    expect(root.style.alignSelf).toBe("flex-end");
  });
});

describe("AvatarMenu open state", () => {
  it("is interactive out of the box: a bare pill opens its menu and closes on select", () => {
    let picked: { label: string; index: number } | null = null;
    const { container } = ui(
      <AvatarMenu
        name={NAME}
        email={EMAIL}
        items={ITEMS}
        onSelect={(item, index) => { picked = { label: item.label, index }; }}
      />,
    );
    expect(container.querySelector('[role="menu"]')).toBeNull();

    fireEvent.click(trigger(container));
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(3);

    fireEvent.click(screen.getByText("Sign out"));
    expect(picked).toEqual({ label: "Sign out", index: 2 });
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  // The other half of the uncontrolled duality: the pill is a TOGGLE, and the
  // change is reported in uncontrolled mode too (a parent that only wants to log
  // or mirror the state must not have to take ownership of it).
  it("reports every uncontrolled change, and a second press closes what the first opened", () => {
    const changes: boolean[] = [];
    const { container } = ui(
      <AvatarMenu name={NAME} email={EMAIL} items={ITEMS} onOpenChange={(o) => { changes.push(o); }} />,
    );

    fireEvent.click(trigger(container));
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    expect(changes).toEqual([true]);

    fireEvent.click(trigger(container));
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(changes).toEqual([true, false]);
    expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
  });

  // The other half of the controlled contract: a parent holding `open` at false
  // owns the state, so a press reports the intent and changes nothing. Without
  // this, an internal state that quietly shadows the prop passes the open-to-
  // closed case and still opens a menu the parent said was shut.
  it("never overrides a controlled open={false}: the press reports, it does not open", () => {
    const changes: boolean[] = [];
    const { container } = ui(
      <AvatarMenu open={false} name={NAME} email={EMAIL} items={ITEMS} onOpenChange={(o) => { changes.push(o); }} />,
    );

    fireEvent.click(trigger(container));
    expect(changes).toEqual([true]);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
    expect(pill(container).style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
  });

  it("honours a controlled open prop and reports every change", () => {
    const changes: boolean[] = [];
    const { container } = ui(
      <AvatarMenu open name={NAME} email={EMAIL} items={ITEMS} onOpenChange={(o) => { changes.push(o); }} />,
    );
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    fireEvent.click(screen.getByText("Profile"));
    // Controlled: the parent owns the state, so the menu stays open until the
    // parent flips `open`, but the close is reported.
    expect(changes).toEqual([false]);
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
  });

  it("passes the identity through to the menu header, so name and email appear twice while open", () => {
    const { container } = ui(<AvatarMenu open name={NAME} email={EMAIL} items={ITEMS} />);
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    // Once in the pill, once in the menu's identity header.
    expect(screen.getAllByText(NAME).length).toBe(2);
    expect(screen.getAllByText(EMAIL).length).toBe(2);
  });

  it("shows the identity header even when the pill itself is compact", () => {
    ui(<AvatarMenu open compact name={NAME} email={EMAIL} items={ITEMS} />);
    expect(screen.getAllByText(NAME).length).toBe(1);
    expect(screen.getAllByText(EMAIL).length).toBe(1);
  });

  // An account with no email is the title-only header shape, and it is the one
  // AvatarMenu produces most often after the full pair. The name must carry no
  // trailing comma from the line that is not there.
  it("gives the menu a title-only header for an account with no email", () => {
    const { container } = ui(<AvatarMenu open name={NAME} items={ITEMS} />);
    const group = container.querySelector('[role="group"]') as HTMLElement;
    expect(group).not.toBeNull();
    expect(group.children.length).toBe(1);
    expect(group.getAttribute("aria-label")).toBe(NAME);
    // ...and that one line names the menu too.
    expect(container.querySelector('[role="menu"]')!.getAttribute("aria-label")).toBe(NAME);
    // Once in the pill, once in the header, and no empty second line anywhere.
    expect(screen.getAllByText(NAME).length).toBe(2);
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(ITEMS.length);
  });

  // The hand-off's AvatarMenu defaults to align="end": a topbar parks the account
  // pill at the trailing edge, where a leading-aligned menu runs off the surface.
  // Plain Dropdown keeps the opposite default, so this is AvatarMenu's own.
  it("hangs the menu from the pill's trailing edge by default, and from the leading edge with alignStart", () => {
    // The inline (no OverlayProvider) fallback positions the card absolutely under
    // the trigger. The kit writes the logical `start`/`end` inset; react-native-web
    // resolves it to the physical side for the active writing direction, so an LTR
    // render reads right for the default and left for alignStart.
    const byDefault = ui(<AvatarMenu open name={NAME} items={ITEMS} />).container;
    expect(anchorOf(byDefault).right).toBe("0px");
    expect(anchorOf(byDefault).left).toBe("");
    cleanup();

    const start = ui(<AvatarMenu open alignStart name={NAME} items={ITEMS} />).container;
    expect(anchorOf(start).left).toBe("0px");
    expect(anchorOf(start).right).toBe("");
    cleanup();

    // Spelling the default out explicitly lands in the same place as omitting it.
    const end = ui(<AvatarMenu open alignEnd name={NAME} items={ITEMS} />).container;
    expect(anchorOf(end).right).toBe("0px");
    cleanup();

    // Both passed: `alignEnd` outranks `alignStart`, the documented precedence.
    const both = ui(<AvatarMenu open alignStart alignEnd name={NAME} items={ITEMS} />).container;
    expect(anchorOf(both).right).toBe("0px");
    expect(anchorOf(both).left).toBe("");
  });

  // The inline anchor above is the FALLBACK. Every real app and every docs stage
  // mounts an OverlayProvider, so the menu is portaled and placed by
  // AnchoredOverlay from a measured inset instead of its own start/end style. The
  // alignment has to survive that hand-off, or the pill's trailing-edge default is
  // right in the test and wrong in the product.
  it("wires the same alignment into the PORTALED overlay, where every real app runs it", async () => {
    await withLayout(async () => {
      const byDefault = ui(
        <OverlayProvider>
          <AvatarMenu open name={NAME} email={EMAIL} items={ITEMS} />
        </OverlayProvider>,
      ).container;
      // Hosted, the trailing edge is a `right` inset measured from the outlet's
      // own edge. Observe the mounted menu and its placement instead of assuming
      // a fixed number of milliseconds completes the measurement chain.
      await waitFor(() => {
        expect(byDefault.querySelector('[role="menu"]')).not.toBeNull();
        expect(anchorOf(byDefault).right).toBe("0px");
        expect(anchorOf(byDefault).left).toBe("");
      });
      cleanup();

      const start = ui(
        <OverlayProvider>
          <AvatarMenu open alignStart name={NAME} email={EMAIL} items={ITEMS} />
        </OverlayProvider>,
      ).container;
      await waitFor(() => {
        expect(start.querySelector('[role="menu"]')).not.toBeNull();
        expect(anchorOf(start).left).toBe("0px");
        expect(anchorOf(start).right).toBe("");
      });
      cleanup();

      // ...and the precedence holds on this path too.
      const both = ui(
        <OverlayProvider>
          <AvatarMenu open alignStart alignEnd name={NAME} email={EMAIL} items={ITEMS} />
        </OverlayProvider>,
      ).container;
      await waitFor(() => {
        expect(both.querySelector('[role="menu"]')).not.toBeNull();
        expect(anchorOf(both).right).toBe("0px");
        expect(anchorOf(both).left).toBe("");
      });
    });
  });
});

describe("AvatarMenu accessibility and disabled", () => {
  it("exposes a menu-popup button whose aria-expanded tracks the menu", () => {
    const { container } = ui(<AvatarMenu name={NAME} email={EMAIL} items={ITEMS} />);
    const button = trigger(container);
    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
  });

  it("never opens while disabled, and announces the disabled trigger", () => {
    let changed = false;
    const { container } = ui(
      <AvatarMenu disabled name={NAME} email={EMAIL} items={ITEMS} onOpenChange={() => { changed = true; }} />,
    );
    const button = trigger(container);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(changed).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps a disabled pill collapsed even when open is forced", () => {
    const { container } = ui(<AvatarMenu open disabled name={NAME} items={ITEMS} />);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
  });
});

describe("AvatarMenu: Dark Factory's identity pill on every platform", () => {
  // No platform ships an identity pill, so every platform takes Dark Factory's (its
  // TopBar role switcher); the numbers are the web hand-off's --p-idpill-* tokens
  // (styles/tokens/platforms.css), which native reads from the skin, never the CSS.

  it("is one skin on the web, iOS and Android", () => {
    expect(iosMenuSkin).toBe(webMenuSkin);
    expect(androidMenuSkin).toBe(webMenuSkin);
  });

  it("is a bare 32px pill that takes the accent fill under the pointer and while open", () => {
    expect(webMenuSkin.menuPill).toMatchObject({ height: 32, gap: 10, paddingStart: 2, paddingEnd: 8 });
    expect(webMenuSkin.menuPill.borderWidth).toBeUndefined();
    expect(webMenuSkin.menuPillFill(lightColors, false)).toEqual({ backgroundColor: "transparent" });
    expect(webMenuSkin.menuPillFill(lightColors, true)).toEqual({ backgroundColor: lightColors.accent });
    expect(webMenuSkin.menuPillName).toMatchObject({ fontSize: 12, lineHeight: 14, fontWeight: "700" });
    expect(webMenuSkin.menuPillSecondary).toMatchObject({ fontSize: 10.5, lineHeight: 13, fontWeight: "600" });
    expect(webMenuSkin.menuChevronSize).toBe(14);
  });

  it("rings the viewer's disc in the violet glow, over a ring of the card", () => {
    const glow = webMenuSkin.menuDiscGlow(lightColors).boxShadow as string;
    expect(glow).toContain(`2px ${lightColors.card}`);
    expect(glow).toContain(`3.5px ${lightColors.primary}`);
    const { container } = ui(<AvatarMenu name={NAME} email={EMAIL} items={ITEMS} />);
    const ring = pill(container).firstElementChild as HTMLElement;
    expect(ring.style.boxShadow).toContain("3.5px");
  });

  it("paints the rest and the open fill on the rendered pill, on every platform build", async () => {
    for (const { name, file } of PLATFORM_MENUS) {
      const Menu = await loadMenu(file);
      const closed = pill(ui(<Menu name={NAME} email={EMAIL} items={ITEMS} />).container);
      expect(closed.style.backgroundColor, name).toBe("rgba(0, 0, 0, 0.00)");
      cleanup();
      const open = pill(ui(<Menu open name={NAME} email={EMAIL} items={ITEMS} />).container);
      expect(open.style.backgroundColor, name).toBe(asRgba(lightColors.accent));
      cleanup();
    }
  });

  it("fills at once under the pointer, and keeps the email line at 4.5:1 on that fill", () => {
    const { container } = ui(<AvatarMenu name={NAME} email={EMAIL} items={ITEMS} />);
    const capsule = pill(container);
    fireEvent.pointerEnter(capsule, { pointerType: "mouse" });
    expect(capsule.style.backgroundColor).toBe(asRgba(lightColors.accent));
    fireEvent.pointerLeave(capsule);
    expect(capsule.style.backgroundColor).toBe("rgba(0, 0, 0, 0.00)");
    for (const t of [lightColors, darkColors]) {
      expect(contrastRatio(t["muted-foreground"], t.accent)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("Avatar tiny: the identity pill's disc", () => {
  // The kit's own scale is {tiny 24, small 28, default 40, large 48}; the
  // hand-off's is {24, 32, 40}. `tiny` is the step that meets the hand-off's
  // 24px avatar without re-scaling the three sizes already shipped.
  it("renders a 24px disc", () => {
    const { container } = ui(<Avatar tiny name={NAME} testID="disc" />);
    expect(at(container, "disc").style.width).toBe(`${DISC}px`);
    expect(at(container, "disc").style.height).toBe(`${DISC}px`);
  });

  it("wins the size axis over small and large (precedence tiny > small > large)", () => {
    const { container } = ui(<Avatar tiny small large name={NAME} testID="disc" />);
    expect(at(container, "disc").style.width).toBe(`${DISC}px`);
  });

  // Dark Factory sets initials at a third of the disc, 8px on a 24px disc; the kit's 10px
  // source floor holds the tiny disc's initials there, bold, on every platform (one skin).
  it("holds the tiny disc's initials at the 10px floor, bold, on every platform", () => {
    for (const skin of [webSkin, iosSkin, androidSkin]) {
      expect(skin.labelType.tiny).toMatchObject({ fontSize: 10, lineHeight: 10, fontWeight: "800" });
    }
    expect(iosSkin).toBe(webSkin);
    expect(androidSkin).toBe(webSkin);
  });

  it("stacks at its own overlap in an AvatarGroup, so the size axis stays complete", () => {
    const { container } = ui(
      <AvatarGroup tiny max={2} testID="stack">
        <Avatar name="Ada Byron" testID="a0" />
        <Avatar name="Bob Cat" />
      </AvatarGroup>,
    );
    // The group forwards `tiny` to every child, so the whole stack is uniform.
    expect(at(container, "a0").style.width).toBe(`${DISC}px`);
  });
});

describe("AvatarMenu capsule inset", () => {
  // Dark Factory's pill holds its disc 2px inside the capsule; the kit's `small` (28px)
  // disc in the 32px pill keeps that inset.
  it("holds a small (28px) disc 2px inside the 32px pill", () => {
    expect(((webMenuSkin.menuPill.height as number) - 28) / 2).toBe(2);
    expect(webMenuSkin.menuPill.paddingStart).toBe(2);
    ui(<AvatarMenu name={NAME} email={EMAIL} items={ITEMS} />);
    // The initials Text is the avatar box's only child, so its parent IS the disc.
    const disc = screen.getByText("RC").parentElement as HTMLElement;
    expect(disc.style.width).toBe("28px");
    expect(disc.style.height).toBe("28px");
  });
});

describe("AvatarMenu disabled dim", () => {
  // The pill fades by the Dropdown skin's disabled opacity (its trigger owns the
  // press), so these are the hand-off's --p-disabled per platform: 0.5 on web,
  // 0.4 under [data-platform="ios"], 0.38 (M3) under [data-platform="android"].
  it("uses the hand-off's --p-disabled on each platform", () => {
    expect(webMenuSurface.disabledOpacity).toBe(0.5);
    expect(iosMenuSurface.disabledOpacity).toBe(0.4);
    expect(androidMenuSurface.disabledOpacity).toBe(0.38);
  });

  it("paints it on the rendered web pill", () => {
    const { container } = ui(<AvatarMenu disabled name={NAME} email={EMAIL} items={ITEMS} />);
    expect(trigger(container).style.opacity).toBe("0.5");
  });
});
