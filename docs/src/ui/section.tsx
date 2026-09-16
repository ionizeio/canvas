import { type ReactNode } from "react";
import { View } from "@ionizeio/canvas";
import { H2 } from "./prose";

// A titled content section with consistent vertical rhythm.
export function Section({ title, children, gap = 12 }: { title?: string; children: ReactNode; gap?: number }) {
  return (
    <View style={{ gap }}>
      {title ? <H2>{title}</H2> : null}
      {children}
    </View>
  );
}
