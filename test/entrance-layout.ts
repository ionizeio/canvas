import { act } from "@testing-library/react";
import type { LayoutChangeEvent } from "react-native";

type LayoutHost = Element & { __reactLayoutHandler?: (event: LayoutChangeEvent) => void };
export interface FixtureSize { width: number; height: number }

/** Deliver a declared fixture layout through RNW's native onLayout boundary. */
export function layoutElement(node: Element, size: FixtureSize): void {
  const handler = (node as LayoutHost).__reactLayoutHandler;
  if (!handler) throw new Error("The fixture node has no native onLayout handler");
  act(() => handler({
    nativeEvent: { layout: { x: 0, y: 0, ...size } },
  } as LayoutChangeEvent));
}

/**
 * Happy-dom has no layout engine. Give an opened overlay its intended wrapper
 * size before querying or operating its accessible contents. This targets only
 * a concealed ancestor with a layout handler, never its rows or scroll viewport.
 * Owner readiness still applies; supplying a size cannot override ready=false.
 */
export function layoutEntrance(content: Element, size: FixtureSize): boolean {
  for (let node = content.parentElement; node; node = node.parentElement) {
    if (node.getAttribute("aria-hidden") === "true" &&
        typeof (node as LayoutHost).__reactLayoutHandler === "function") {
      // A liquid popup (PopupCard) measures its CARD inside the concealed wrapper
      // before its material can settle and reveal the rows, so the card boundary
      // (the first layout host above the scroll viewport, or the first one above
      // the content when the content owns its scrolling) gets the size too. Row
      // and viewport handlers stay untouched: fixtures stage those deliberately.
      let viewport: Element | null = null;
      for (let inner = content.parentElement; inner && inner !== node; inner = inner.parentElement) {
        const overflow = getComputedStyle(inner).overflowY;
        if (!viewport && (overflow === "auto" || overflow === "scroll")) { viewport = inner; continue; }
        if (viewport && typeof (inner as LayoutHost).__reactLayoutHandler === "function") { layoutElement(inner, size); break; }
      }
      layoutElement(node, size);
      return true;
    }
  }
  return false;
}

/** Supply one explicitly declared size to the opened overlays in a test fixture. */
export function layoutEntrances(root: ParentNode, size: FixtureSize): void {
  for (const content of root.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"]')) {
    layoutEntrance(content, size);
  }
}

/** Locate the four native layout boundaries of one concealed hosted overlay. */
export function hostedEntranceParts(content: Element): {
  entrance: Element; card: Element; viewport: Element; content: Element;
} {
  let viewport: Element | null = null;
  let card: Element | null = null;
  for (let node: Element | null = content; node; node = node.parentElement) {
    if (node.getAttribute("aria-hidden") === "true" &&
        typeof (node as LayoutHost).__reactLayoutHandler === "function") {
      if (!viewport || !card || !viewport.firstElementChild) break;
      return { entrance: node, card, viewport, content: viewport.firstElementChild };
    }
    const overflow = getComputedStyle(node).overflowY;
    if (!viewport && (overflow === "auto" || overflow === "scroll")) viewport = node;
    else if (viewport && typeof (node as LayoutHost).__reactLayoutHandler === "function") card = node;
  }
  throw new Error("The fixture has no concealed hosted card and scrollport around its content");
}

/**
 * Supply the hosted owner's card and scroll measurements as well as its Entrance
 * size. Separate sizes allow capped-content fixtures to state real geometry.
 * Descendant row and input layout handlers are deliberately left untouched.
 */
export function layoutHostedEntrance(content: Element, cardSize: FixtureSize, viewportSize = cardSize, contentSize = viewportSize): void {
  const nodes = hostedEntranceParts(content);
  layoutElement(nodes.viewport, viewportSize);
  layoutElement(nodes.content, contentSize);
  layoutElement(nodes.card, cardSize);
  layoutElement(nodes.entrance, cardSize);
}
