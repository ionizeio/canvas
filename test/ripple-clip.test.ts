import { describe, it, expect } from "bun:test";
import { StyleSheet } from "react-native";
import { isValidElement, type ReactElement } from "react";
import { RippleClip, rippleClipWrapperStyle, cornerRadii, splitElevation } from "../src/style/ripple-clip.tsx";
import { iosSkin, androidSkin, webSkin } from "../src/atoms/button/button.styles.ts";
import { lightColors } from "../src/style/tokens.ts";

// A bounded android_ripple (borderless:false) is the pressable's OWN rectangular-masked
// background drawable. React Native implements overflow:"hidden" as a path-clip applied only
// in ViewGroup.dispatchDraw — i.e. only to CHILD views — so a node can never clip its own
// ripple; the rectangle bleeds past rounded corners. The fix is a rounded, overflow:"hidden"
// PARENT (<RippleClip>) so the child ripple is clipped. These tests pin the parent's clip
// style (Android-only, rounded) and guard the Button skin against the disproven same-node
// overflow:"hidden" creeping back in. The ripple itself is Android-native and invisible under
// react-native-web, so its rendering is verified on-device; here we verify the clip contract.

describe("rippleClipWrapperStyle", () => {
  const shape = { borderRadius: 9999 };

  it("clips to the rounded shape AND overflow:hidden on Android", () => {
    const flat = StyleSheet.flatten(rippleClipWrapperStyle(shape, true));
    expect(flat.borderRadius).toBe(9999);
    expect(flat.overflow).toBe("hidden");
  });

  it("adds no clip off Android (iOS/web have no ripple to clip)", () => {
    expect(rippleClipWrapperStyle(shape, false)).toBeNull();
  });

  it("adds no clip when there is no shape, even on Android", () => {
    expect(rippleClipWrapperStyle(undefined, true)).toBeNull();
  });
});

describe("RippleClip carries the touch slop", () => {
  // Android hit-tests a clipping view only inside its own bounds plus its own hitSlop, so the
  // wrapper must admit the area its pressable's slop declares. Checked on the element the
  // component returns: the test DOM (react-native-web) drops hitSlop, so a rendered check
  // would pass whether or not the prop is there.
  const clip = (props: Omit<Parameters<typeof RippleClip>[0], "children">) => {
    const element = RippleClip({ ...props, children: null });
    if (!isValidElement(element)) throw new Error("RippleClip returned no element");
    return element as ReactElement<{ hitSlop?: unknown; style?: unknown }>;
  };
  const shape = { borderRadius: 9999 };

  it("puts the insets it is given on its own view", () => {
    const insets = { top: 4, bottom: 4, left: 0, right: 0 };
    expect(clip({ shape, hitSlop: insets }).props.hitSlop).toEqual(insets);
    expect(clip({ shape, hitSlop: 11 }).props.hitSlop).toBe(11);
  });

  it("carries none when the pressable has none", () => {
    expect(clip({ shape }).props.hitSlop).toBeUndefined();
  });

  it("adds no style for the slop: the touch area is not layout", () => {
    const style = { alignSelf: "stretch" as const };
    expect(clip({ shape, style, hitSlop: 8 }).props.style).toEqual(clip({ shape, style }).props.style);
  });
});

describe("cornerRadii", () => {
  it("extracts a uniform borderRadius and drops everything else", () => {
    expect(cornerRadii({ borderRadius: 9999, backgroundColor: "#fff", padding: 12 })).toEqual({
      borderRadius: 9999,
    });
  });

  it("extracts per-corner radii (a split button / top-only field)", () => {
    const shape = { borderTopStartRadius: 8, borderBottomStartRadius: 8, paddingHorizontal: 16 };
    expect(cornerRadii(shape)).toEqual({ borderTopStartRadius: 8, borderBottomStartRadius: 8 });
  });

  it("flattens a style array before extracting (the common call form)", () => {
    expect(cornerRadii([{ flexDirection: "row" }, { borderRadius: 4 }])).toEqual({ borderRadius: 4 });
  });

  it("returns {} for a shape with no radius, so the wrapper adds no clip", () => {
    expect(cornerRadii({ flexDirection: "row", padding: 8 })).toEqual({});
    expect(cornerRadii(null)).toEqual({});
  });
});

describe("splitElevation", () => {
  // The render harness reports web, so this exercises the off-Android branch: the shadow stays
  // wholly on the child and iOS/web are unchanged. The Android branch (elevation → parent, 0 on
  // child) is covered by the source contract; verified visually on device.
  it("off Android, keeps the whole shadow on the child and adds nothing to the parent", () => {
    const shadow = { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, elevation: 6 };
    const { parent, child } = splitElevation(shadow);
    expect(parent).toBeNull();
    expect(child).toMatchObject(shadow);
  });
});

describe("Button skin ripple clip shape", () => {
  const opts = { icon: false, block: false, dim: false };

  it("the Android skin clips the ripple to the pill (same 9999 radius as the container)", () => {
    expect(androidSkin.rippleClipShape?.("base", opts)).toEqual({ borderRadius: 9999 });
    // icon buttons are circles at the same radius, so the clip still matches their corners.
    expect(androidSkin.rippleClipShape?.("base", { ...opts, icon: true })).toEqual({
      borderRadius: 9999,
    });
  });

  it("iOS and web declare no clip shape (no bounded ripple to clip)", () => {
    expect(iosSkin.rippleClipShape).toBeUndefined();
    expect(webSkin.rippleClipShape).toBeUndefined();
  });
});

describe("Button Android container no longer carries the disproven same-node clip", () => {
  const base = androidSkin.container(lightColors, "primary", "base", {
    icon: false,
    block: false,
    dim: false,
  });

  it("does not set overflow:hidden on the ripple node (a same-node clip cannot clip the ripple)", () => {
    // The clip belongs on the <RippleClip> parent, not the node that carries the ripple.
    expect(base.overflow).toBeUndefined();
  });

  it("keeps the pill radius so the parent clip's rounded outline matches the button", () => {
    expect(base.borderRadius).toBe(9999);
  });

  it("does not force width on the node for a block button (block lives on the wrapper)", () => {
    const blocked = androidSkin.container(lightColors, "primary", "base", {
      icon: false,
      block: true,
      dim: false,
    });
    expect(blocked.width).toBeUndefined();
  });
});
