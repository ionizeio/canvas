import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";
import { AccessibilityInfo, Platform, type AccessibilityProps, type TextInput } from "react-native";
import { useComposedRefs } from "./use-composed-refs.js";

type ContentIdentity = object;
type ReturnIntent = {
  sequence: number;
  opening: number;
  input: TextInput | null;
  content: ContentIdentity | null;
  accepted: boolean;
};

/** Return AT focus only for an accessibility selection that immediately closes. */
export function useAccessibilityReturn(open: boolean, disabled: boolean, forwardedRef: Ref<TextInput>) {
  const input = useRef<TextInput>(null);
  const committed = useRef({ mounted: false, open: false, disabled, opening: 0 });
  const opening = open && !committed.current.open ? committed.current.opening + 1 : committed.current.opening;
  const content = useRef<ContentIdentity | null>(null);
  const intent = useRef<ReturnIntent | null>(null);
  const sequence = useRef(0);
  const [selection, setSelection] = useState(0);
  const native = Platform.select({ ios: true, android: true, default: false });

  const attachInput = useCallback((node: TextInput | null) => {
    // A transient detach matters even if the same host returns before cleanup.
    // Changing a caller's ref identity also conservatively cancels the request;
    // final host equality cannot prove continuous attachment.
    if (node == null || node !== input.current) intent.current = null;
    input.current = node;
  }, []);
  const inputRef = useComposedRefs(attachInput, forwardedRef);

  const cancel = useCallback(() => { intent.current = null; }, []);
  useIsomorphicLayoutEffect(() => {
    committed.current.mounted = true;
    return () => {
      committed.current.mounted = false;
      intent.current = null;
    };
  }, []);
  useIsomorphicLayoutEffect(() => {
    committed.current = { mounted: true, open, disabled, opening };
    const request = intent.current;
    if (!request) return;
    if (disabled || request.opening !== opening || input.current !== request.input) {
      intent.current = null;
    } else if (selection === request.sequence) {
      // Selection and close run synchronously in the same batched native event.
      // Only its first owner commit can accept the return. A controlled owner
      // that keeps suggestions open expires it, including when close is delayed,
      // so a later external close cannot reclaim unrelated navigation focus.
      if (open) intent.current = null;
      else request.accepted = true;
    }
  });

  const activate = useCallback((select: () => void) => {
    const current = committed.current;
    if (!native || !current.mounted || !current.open || current.disabled
      || current.opening !== opening || intent.current) return;
    const request: ReturnIntent = {
      sequence: ++sequence.current,
      opening,
      input: input.current,
      content: content.current,
      accepted: false,
    };
    intent.current = request;
    // Force one owner commit even when controlled value/query callbacks leave
    // their props unchanged. That commit either accepts this close or expires it.
    setSelection(request.sequence);
    try {
      select();
    } catch (error) {
      intent.current = null;
      throw error;
    }
  }, [native, opening]);

  const onContentMount = useCallback((identity: ContentIdentity) => {
    if (content.current !== identity) intent.current = null;
    content.current = identity;
  }, []);
  const onContentUnmount = useCallback((identity: ContentIdentity) => {
    if (content.current === identity) content.current = null;
    const request = intent.current;
    if (!request || request.content !== identity) return;
    intent.current = null;
    const current = committed.current;
    const target = input.current;
    if (!request.accepted || !current.mounted || current.open || current.disabled
      || current.opening !== request.opening || !target || target !== request.input
      || !target.isFocused()) return;
    // The boundary reports React subtree removal, not a native mount or AT
    // acknowledgement. RN routes this live host through Fabric or Paper. Never
    // change editing focus, selection, or keyboard visibility with .focus().
    AccessibilityInfo.sendAccessibilityEvent(target, "focus");
  }, []);

  // `editor` is the attached input itself, for an owner that wants to hand editing
  // focus back to it from a control of its own (the Autocomplete's query echo, which
  // stands where the field was while its list covers it).
  return { inputRef, editor: input, activate, cancel, onContentMount, onContentUnmount };
}

/** Observe the real portaled subtree, which can outlive the owner's close render. */
export function AccessibilityReturnBoundary({ children, onMount, onUnmount }: {
  children: ReactNode;
  onMount: (identity: ContentIdentity) => void;
  onUnmount: (identity: ContentIdentity) => void;
}) {
  const identity = useRef<ContentIdentity>({});
  useEffect(() => {
    const mounted = identity.current;
    onMount(mounted);
    return () => onUnmount(mounted);
  }, [onMount, onUnmount]);
  return <>{children}</>;
}

/** Native activation has a distinct event from an ordinary pointer press. */
export function accessibilitySelectionProps(onActivate: () => void): AccessibilityProps {
  return Platform.select<AccessibilityProps>({
    android: {
      accessibilityActions: [{ name: "activate" }],
      onAccessibilityAction: ({ nativeEvent }) => {
        if (nativeEvent.actionName === "activate") onActivate();
      },
    },
    // Fabric's default accessibilityActivate dispatches onAccessibilityTap;
    // custom action names are a separate iOS path.
    ios: { onAccessibilityTap: onActivate },
    default: {},
  });
}
