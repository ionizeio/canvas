export type OverlaySide = "above" | "below";

const INSET = 8;
const EPSILON = 0.5;

/** Fit an anchored card inside its host's visible vertical band. */
export function fitOverlayHeight({
  triggerTop, triggerHeight, outletHeight, visibleTop = 0, visibleBottom = outletHeight,
  desiredHeight, currentSide = "below", gap, beside = false,
}: {
  triggerTop: number;
  triggerHeight: number;
  outletHeight: number;
  visibleTop?: number;
  visibleBottom?: number;
  desiredHeight: number | null;
  currentSide?: OverlaySide;
  gap: number;
  beside?: boolean;
}): { side: OverlaySide; top?: number; bottom?: number; maxHeight: number } {
  // A content-sized outlet can lie inside the visible viewport without filling
  // it, so its card may extend beyond its own bottom. Only the visible band caps.
  const lower = Math.max(visibleTop, visibleBottom);
  const inset = Math.min(INSET, (lower - visibleTop) / 2);
  const ceiling = visibleTop + inset;
  const floor = lower - inset;
  // Keep cards attached to wholly offscreen anchors. Pulling them into the
  // visible band would cover unrelated controls, including pinned-open demos.
  if (triggerTop >= lower || triggerTop + triggerHeight <= visibleTop) {
    return { side: "below", top: triggerTop + triggerHeight + gap, maxHeight: floor - ceiling };
  }
  const belowTop = Math.max(ceiling, Math.min(floor, triggerTop + triggerHeight + gap));
  const aboveBottom = Math.max(ceiling, Math.min(floor, triggerTop - gap));
  const below = floor - belowTop;
  const above = aboveBottom - ceiling;
  const desired = Math.max(0, desiredHeight ?? Infinity);

  if (beside) {
    const height = Math.min(desired, floor - ceiling);
    return { side: "below", top: Math.max(ceiling, Math.min(triggerTop, floor - height)), maxHeight: floor - ceiling };
  }

  let side = currentSide;
  const current = side === "below" ? below : above;
  const opposite = side === "below" ? above : below;
  // Keep a placement that still fits when filtering shortens a list. A keyboard
  // or resize can invalidate it, so the side is never latched for the opening.
  if (desiredHeight === null || current + EPSILON >= desired) {
    // Current placement still fits.
  } else if (opposite > current + EPSILON) {
    side = side === "below" ? "above" : "below";
  }

  const available = side === "below" ? below : above;
  // A visible trigger can occupy the entire band. Use the whole band when
  // neither adjacent space can display content.
  if (available <= 0) return { side: "below", top: ceiling, maxHeight: floor - ceiling };
  return side === "below"
    ? { side, top: belowTop, maxHeight: available }
    : { side, bottom: outletHeight - aboveBottom, maxHeight: available };
}
