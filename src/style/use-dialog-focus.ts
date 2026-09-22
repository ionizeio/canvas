import { useEffect, useRef, useState, type RefObject } from "react";
import { type View } from "react-native";

// Refs may attach after the hook's open effect: Portal publishes into a sibling
// outlet, and anchored overlays also wait for a trigger measurement. An ordinary
// useRef cannot notify that effect when its panel finally exists. Keep the public
// object-ref API, but reconcile focus from its current setter as well as open.
// These are DOM event/focus operations only, never a platform rendering fork.

const FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex]';

interface FocusSession {
  panel: HTMLElement;
  restoreTarget: HTMLElement | null;
}

// An initially open inline child runs its effect before its parent. The parent
// must preserve the child's focus and original restoration target, instead of
// focusing over it or later restoring into its own disappearing subtree.
const sessions = new Set<FocusSession>();

function trapFocus(panel: HTMLElement): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    // A nested modal may already have wrapped this Tab. Leave that move intact.
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1",
    );
    if (focusables.length === 0) {
      event.preventDefault();
      panel.focus({ preventScroll: true });
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || active === panel || !panel.contains(active)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };
  panel.addEventListener("keydown", onKeyDown);
  return () => panel.removeEventListener("keydown", onKeyDown);
}

function createFocusRef(modal: boolean, onAttach: () => void) {
  let node: View | null = null;
  let enabled = false;
  let restoreTarget: HTMLElement | null = null;
  let session: FocusSession | null = null;
  let removeTrap: (() => void) | undefined;

  const detach = () => {
    if (!session) return;
    const previous = session;
    restoreTarget = previous.restoreTarget;
    session = null;
    removeTrap?.();
    removeTrap = undefined;
    // Portaled children are DOM siblings. Their restoration targets still name
    // the control or panel they opened from, so follow that chain when deciding
    // whether a closing parent owns the current focus.
    const owned = new Set([previous]);
    for (const parent of owned) {
      for (const candidate of sessions) {
        if (parent.panel.contains(candidate.panel) || parent.panel.contains(candidate.restoreTarget)) {
          owned.add(candidate);
        }
      }
    }
    sessions.delete(previous);
    for (const child of owned) {
      if (child !== previous && previous.panel.contains(child.restoreTarget)) {
        child.restoreTarget = previous.restoreTarget;
      }
    }

    // Restore only focus owned by this panel. In particular, a nonmodal popover
    // may close after the user has tabbed to another live control. Its close must
    // not pull that deliberate focus move back to the trigger.
    const active = document.activeElement;
    const orphaned = active == null || active === document.body ||
      !active.isConnected || [...owned].some((owner) => owner.panel.contains(active));
    if (orphaned && previous.restoreTarget?.isConnected) {
      previous.restoreTarget.focus({ preventScroll: true });
    }
  };

  const attach = () => {
    if (!enabled || session || !node || typeof document === "undefined") return;
    const panel = node as unknown as HTMLElement;
    const active = document.activeElement;
    const descendants = [...sessions].filter((candidate) =>
      panel.contains(candidate.panel) && candidate.panel.contains(active),
    );
    const child = descendants.find((candidate) => !descendants.some((other) =>
      other !== candidate && other.panel.contains(candidate.panel),
    ));
    // Follow the child's original target only when our captured target belongs
    // to this panel. Ordinary nested openings still restore to their own trigger.
    if (child && restoreTarget && panel.contains(restoreTarget)) {
      restoreTarget = child.restoreTarget;
    }
    // An initially open child has no opener inside this newly active parent.
    // Closing just that child must return to the parent, while closing the whole
    // parent still restores the original page trigger captured above.
    if (child && !panel.contains(child.restoreTarget)) child.restoreTarget = panel;
    session = { panel, restoreTarget };
    sessions.add(session);
    if (modal) removeTrap = trapFocus(panel);
    if (!child) panel.focus({ preventScroll: true });
  };

  const ref: RefObject<View | null> = {
    get current() { return node; },
    set current(next: View | null) {
      if (next === node) return;
      detach();
      node = next;
      // Setup follows a committed effect, so attaching a panel in the same
      // render that closes it cannot briefly focus it with the previous open
      // value. Detachment still removes its listener immediately.
      if (next && typeof document !== "undefined") onAttach();
    },
  };

  return {
    ref,
    attach,
    activate() {
      if (enabled) return;
      enabled = true;
      // Capture once per opening, including the interval before a hosted panel
      // attaches. Ref replacement or duplicate attachment cannot overwrite it.
      restoreTarget = typeof document === "undefined"
        ? null
        : document.activeElement as HTMLElement | null;
      attach();
    },
    deactivate() {
      enabled = false;
      detach();
      restoreTarget = null;
    },
  };
}

function usePanelFocus(open: boolean, modal: boolean): RefObject<View | null> {
  const [attachment, setAttachment] = useState(0);
  const controllerRef = useRef<ReturnType<typeof createFocusRef> | null>(null);
  if (controllerRef.current == null) {
    controllerRef.current = createFocusRef(modal, () => setAttachment((version) => version + 1));
  }
  const controller = controllerRef.current;

  useEffect(() => {
    if (!open) return;
    controller.activate();
    return () => controller.deactivate();
  }, [open, controller]);

  useEffect(() => {
    controller.attach();
  }, [attachment, controller]);

  return controller.ref;
}

/** Move focus into an attached modal panel, trap Tab, and restore on close.
 * Attach the returned object ref to a View with tabIndex={-1}. Native and SSR
 * do not touch DOM globals; native modal accessibility remains the caller's. */
export function useDialogFocus(open: boolean): RefObject<View | null> {
  return usePanelFocus(open, true);
}

/** Move focus into an attached nonmodal panel and restore on close. Tab remains
 * free to leave the panel. Pass false for an always-visible inline popover. */
export function usePopoverFocus(open: boolean): RefObject<View | null> {
  return usePanelFocus(open, false);
}
