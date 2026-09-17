import type { ReactNode, RefObject } from "react";
import type { View } from "react-native";

export interface GlassBackdropTargetProps {
  targetRef: RefObject<View | null>;
  children?: ReactNode;
}

/** Other platforms already sample their compositor's backdrop directly. */
export function GlassBackdropTarget({ children }: GlassBackdropTargetProps) {
  return children;
}
