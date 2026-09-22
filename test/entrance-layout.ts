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
 * Happy-dom has no layout engine. Give an opened overlay's card its intended size
 * before querying or operating its accessible contents: the first layout host above
 * the content's scroll viewport (or above the content itself, when the content
 * owns its scrolling) is the card, whose report releases a hosted card's hold.
 * Row and viewport handlers stay untouched: fixtures stage those deliberately.
 * Returns false when nothing above the content is concealed (an inline card).
 */
export function layoutEntrance(content: Element, size: FixtureSize): boolean {
  for (let node = content.parentElement; node; node = node.parentElement) {
    if (node.getAttribute("aria-hidden") === "true") {
      let viewport: Element | null = null;
      for (let inner = content.parentElement; inner && inner !== node; inner = inner.parentElement) {
        const overflow = getComputedStyle(inner).overflowY;
        if (!viewport && (overflow === "auto" || overflow === "scroll")) { viewport = inner; continue; }
        if (viewport && typeof (inner as LayoutHost).__reactLayoutHandler === "function") { layoutElement(inner, size); break; }
      }
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

/** Locate the native layout boundaries of one concealed hosted overlay. */
export function hostedEntranceParts(content: Element): {
  entrance: Element; card: Element; viewport: Element; content: Element;
} {
  let viewport: Element | null = null;
  let card: Element | null = null;
  for (let node: Element | null = content; node; node = node.parentElement) {
    if (node.getAttribute("aria-hidden") === "true") {
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
 * Supply the hosted owner's card and scroll measurements. Separate sizes allow
 * capped-content fixtures to state real geometry. Descendant row and input layout
 * handlers are deliberately left untouched.
 */
export function layoutHostedEntrance(content: Element, cardSize: FixtureSize, viewportSize = cardSize, contentSize = viewportSize): void {
  const nodes = hostedEntranceParts(content);
  layoutElement(nodes.viewport, viewportSize);
  layoutElement(nodes.content, contentSize);
  layoutElement(nodes.card, cardSize);
}
