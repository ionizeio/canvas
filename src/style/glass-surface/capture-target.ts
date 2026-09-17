import { useEffect, useSyncExternalStore, type RefObject } from "react";
import type { View } from "react-native";

/** Ownership belongs to one safe native plane, never a global screenshot. */
export interface CaptureTarget {
  ref: RefObject<View | null>;
  attach: (view: View | null) => void;
  setAvailable: (view: View, available: boolean) => void;
  retain: () => () => void;
  subscribe: (listener: () => void) => () => void;
  ready: () => boolean;
  generation: () => number;
  active: () => boolean;
}

const owners = new WeakMap<RefObject<View | null>, CaptureTarget>();
const noopSubscribe = () => () => {};
const zero = () => 0;
const inactive = () => false;

export function createCaptureTarget(): CaptureTarget {
  const ref: RefObject<View | null> = { current: null };
  const listeners = new Set<() => void>();
  let consumers = 0;
  let generation = 0;
  let supported = false;
  const emit = () => listeners.forEach((listener) => listener());
  const target: CaptureTarget = {
    ref,
    attach(view) {
      if (ref.current === view) return;
      ref.current = view;
      supported = false;
      generation++;
      emit();
    },
    setAvailable(view, available) {
      if (ref.current !== view || supported === available) return;
      supported = available;
      generation++;
      emit();
    },
    retain() {
      consumers++;
      if (consumers === 1) emit();
      let retained = true;
      return () => {
        if (!retained) return;
        retained = false;
        consumers--;
        if (consumers === 0) emit();
      };
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    ready: () => ref.current !== null && supported,
    generation: () => generation,
    active: () => consumers > 0 && ref.current !== null && supported,
  };
  owners.set(ref, target);
  return target;
}

export function captureTargetOwner(ref: RefObject<View | null>): CaptureTarget | undefined {
  return owners.get(ref);
}

/** Attachment may occur after a backdrop claim arrives. Observe it without remounting content. */
export function useReadyCaptureTarget(ref: RefObject<View | null> | null): RefObject<View | null> | null {
  const owner = ref ? owners.get(ref) : undefined;
  useSyncExternalStore(owner?.subscribe ?? noopSubscribe, owner?.generation ?? zero, zero);
  return owner && !owner.ready() ? null : ref;
}

export function useCaptureDemand(ref: RefObject<View | null>, enabled: boolean): void {
  const owner = owners.get(ref);
  useEffect(() => enabled ? owner?.retain() : undefined, [owner, enabled]);
}

export function useCaptureEnabled(ref: RefObject<View | null>): boolean {
  const owner = owners.get(ref);
  return useSyncExternalStore(owner?.subscribe ?? noopSubscribe, owner?.active ?? inactive, inactive);
}
