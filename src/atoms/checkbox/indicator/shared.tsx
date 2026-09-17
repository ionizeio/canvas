import { type ReactNode } from "react";
import { View, Text, useTheme, type ColorTokens, type ViewStyle, GlassPane, paneStyle, isGlass } from "../../../style/index.js";
import type { CheckboxSkin, Size } from "../checkbox.shared.js";

// Shared by the interactive Checkbox and its private decorative counterpart, so
// removing a nested control does not change the indicator's layout or skin.
export const CHECKBOX_ROW: ViewStyle = { flexDirection: "row", alignItems: "flex-start", gap: 8 };

// Keep the glyph out of flow. Native Android otherwise measures the square from
// the Text's width instead of honoring the skin's explicit box width.
const GLYPH_LAYER: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

/** Private visual anatomy, with no press handler, role, or focusable host. */
export function CheckboxIndicatorBox({ skin, tokens, size, checked, indeterminate, nudge }: {
  skin: CheckboxSkin;
  tokens: ColorTokens;
  size: Size;
  checked?: boolean;
  indeterminate?: boolean;
  nudge: boolean;
}) {
  const filled = !!(indeterminate || checked);
  // Under glass the box is a CONTROL-layer puck: a GlassPane paints the material
  // behind the glyph (BRAND-tinted while filled) and the box drops its fill and
  // outline (the pane's material and rim carry them).
  const glass = isGlass(useTheme());
  const box = skin.box(tokens, filled, size, nudge);
  return (
    <View style={paneStyle(glass, box)}>
      <GlassPane layer="control" shape={box} brand={filled ? tokens.primary : undefined} interactive />
      {filled ? (
        <View style={GLYPH_LAYER}>
          <Text style={skin.glyph(tokens, size)}>{indeterminate ? "–" : "✓"}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Shared text and indicator anatomy, with no interaction or semantic role. */
export function CheckboxContent({ skin, tokens, size, checked, indeterminate, children, description }: {
  skin: CheckboxSkin;
  tokens: ColorTokens;
  size: Size;
  checked?: boolean;
  indeterminate?: boolean;
  children?: ReactNode;
  description?: ReactNode;
}) {
  const hasText = children != null || description != null;
  return (
    <>
      <CheckboxIndicatorBox skin={skin} tokens={tokens} size={size} checked={checked}
        indeterminate={indeterminate} nudge={hasText} />
      {hasText ? (
        description != null ? (
          <View style={TEXT_COLUMN}>
            {children != null ? <Text style={skin.label(tokens, size)}>{children}</Text> : null}
            <Text style={skin.description(tokens, size)}>{description}</Text>
          </View>
        ) : (
          <Text style={skin.label(tokens, size)}>{children}</Text>
        )
      ) : null}
    </>
  );
}

// Same snug title/description spacing and shrink behavior as the interactive
// Checkbox. Sharing this layout keeps private compound controls in sync.
const TEXT_COLUMN: ViewStyle = { flexShrink: 1, gap: 8 };

export interface CheckboxIndicatorProps {
  checked?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  description?: ReactNode;
}

/** Checkbox visuals for a parent that owns the full row's interaction and name. */
export function createCheckboxIndicator(skin: CheckboxSkin) {
  return function CheckboxIndicator({ checked, disabled, children, description }: CheckboxIndicatorProps) {
    const { tokens } = useTheme();
    return (
      <View style={[CHECKBOX_ROW, disabled ? { opacity: skin.disabledOpacity } : null]}>
        <CheckboxContent skin={skin} tokens={tokens} size="base" checked={checked} description={description}>
          {children}
        </CheckboxContent>
      </View>
    );
  };
}
