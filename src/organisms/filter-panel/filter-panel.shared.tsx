import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useMemo } from "react";
import { View, Text, Pressable, useTheme, useControllableState, useBreakpoint, breakpoints, RippleClip, cornerRadii, type BreakpointKey, type StyleProp, type ViewStyle, GlassPane, paneStyle } from "../../style/index.js";
import { Badge as WebBadge } from "../../atoms/badge/badge.js";
import { Button as WebButton } from "../../atoms/button/button.js";
import { CheckboxIndicator as WebCheckbox } from "../../atoms/checkbox/indicator/index.js";
import { useSpaceActivation } from "../../style/use-space-activation.js";
import { Drawer } from "../drawer/drawer.js";
import {
  type Density,
  type FilterPanelSkin,
  type CheckboxComponent,
  type BadgeComponent,
  type ButtonComponent,
} from "./filter-panel.styles.js";

// Shared FilterPanel shell. The structure (the fixed-width column, the
// header with the "Filters" title + active-count badge + Clear action, and the
// grouped checkbox list), the public boolean-prop API (`bordered`, `compact`),
// the density precedence, the change/clear handlers, and accessibility all live
// here once. A platform file supplies only its skin (panel radius, padding/gap
// density, group-heading type, and the press feedback on this component's OWN
// option rows) and calls createFilterPanel.
//
// FilterPanel composes shared Checkbox visuals with Badge and Button atoms: each
// platform wrapper passes its own Checkbox visual/Badge/Button variant into
// createFilterPanel (the way field passes the platform Input/Button), so the rows
// and the header Clear action read native per OS without this organism re-skinning
// any atom. The literal `.ios`/`.android` atom imports in those wrappers are
// required for the WEB docs 3-up, where a barrel import would resolve the web
// atoms in every column.
//
// FilterPanel is a "Light" platform treatment: one structure, with per-OS touches
// limited to panel radius, spacing density, group-heading tracking, and press
// feedback (Android ripple on the option rows; iOS/web opacity dim).

export interface FilterOption {
  /** Row label, shown beside the checkbox. */
  label: string;
  /**
   * Stable key this option is identified by in the controlled `value`/`defaultValue`
   * arrays. Defaults to `"groupIndex:optionIndex"`; set it (e.g. a slug) when you
   * drive selection from a URL/query so reordering groups doesn't break the mapping.
   */
  value?: string;
  /** Whether this option is initially checked (seeds uncontrolled state when
   *  `defaultValue` is not given). */
  checked?: boolean;
  /** Optional trailing count, rendered as a secondary badge. */
  count?: string;
}

export interface FilterGroup {
  /** Group heading, rendered uppercase and muted. */
  title: string;
  /** The checkbox options under this group. */
  options: FilterOption[];
}

export interface FilterPanelProps {
  /** Filter groups, each a heading plus its checkbox options. */
  groups: FilterGroup[];
  /**
   * Controlled selection: the keys of the checked options (each option's `value`,
   * falling back to `"groupIndex:optionIndex"`). Provide it with `onSelectionChange`
   * to drive or reset selection from a parent (e.g. from a URL query).
   */
  value?: string[];
  /** Initial selection for uncontrolled use. When omitted, the panel seeds from each
   *  option's `checked` flag. */
  defaultValue?: string[];
  /** Active-filter count shown next to the "Filters" title. Omit to derive it from the checked options. */
  activeCount?: number;
  /** Fired when the header "Clear" action is pressed. */
  onClear?: () => void;
  /** Fired with the full set of checked keys whenever the selection changes (both
   *  modes) — the controlled signal a parent mirrors into `value`. */
  onSelectionChange?: (selected: string[]) => void;
  /** Fired when a single option row toggles, with its group/option indexes and next
   *  value. Fires alongside `onSelectionChange`. */
  onChange?: (groupIndex: number, optionIndex: number, next: boolean) => void;
  // Surface (pick one path): a rounded, bordered card vs. a bare panel.
  bordered?: boolean;
  // Density (pick one): tighten the panel's padding and row spacing.
  compact?: boolean;

  // Responsive drawer axis: at and below `drawerBreakpoint` the docked panel
  // collapses to a kit-owned "Filters (n)" outline Button that opens the panel
  // inside a start-edge Drawer, so a phone keeps its width for the results.
  /** Opt in to the responsive panel->drawer behavior. Off by default: a bare
   *  panel is the docked column at every width, exactly as before. */
  responsive?: boolean;
  /** The width at and below which `responsive` collapses to the drawer
   *  (default `sm` = 640). */
  drawerBreakpoint?: BreakpointKey;
  /** The responsive drawer's open state (CONTROLLED). Omit for the
   *  self-managed trigger button. */
  open?: boolean;
  /** Initial open state for the uncontrolled responsive drawer (default closed). */
  defaultOpen?: boolean;
  /** Fired when the responsive drawer opens or closes (trigger, scrim, back). */
  onOpenChange?: (open: boolean) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// Density precedence when more than one is passed: first match wins. There is a
// single density flag today, so this collapses to compact vs. the default.
function densityOf(p: FilterPanelProps): Density {
  if (p.compact) return "compact";
  return "base";
}

/**
 * Build a FilterPanel component from a platform skin.
 *
 * `CheckboxVisual` / `Badge` / `Button` supply the platform-correct option
 * rows, the counts, and the header Clear action. Each platform's thin
 * `.tsx`/`.ios`/`.android` file passes the variants it already resolves for that
 * platform, so the panel matches its OS. They default to the WEB atoms because a
 * bare barrel import always resolves the WEB atoms in a browser bundler, which is
 * wrong in the docs 3-up; the device Metro resolves the right atoms by extension
 * regardless, so the defaults only matter for the web column.
 */
export function createFilterPanel(
  skin: FilterPanelSkin,
  CheckboxVisual: CheckboxComponent = WebCheckbox,
  Badge: BadgeComponent = WebBadge,
  Button: ButtonComponent = WebButton,
) {
  function OptionRow({ option, checked, onToggle }: { option: FilterOption; checked: boolean; onToggle: () => void }) {
    const { tokens } = useTheme();
    const keyboard = useSpaceActivation(false, onToggle);
    const ripple = skin.rowRipple ? skin.rowRipple(tokens) : undefined;
    return (
      <Pressable
        {...keyboard}
        style={({ pressed }) => [
          skin.optionRow,
          skin.rowPressedOpacity != null && pressed ? { opacity: skin.rowPressedOpacity } : null,
        ]}
        onPress={onToggle}
        android_ripple={ripple}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        aria-checked={checked}
        accessibilityLabel={option.count != null ? `${option.label}, ${option.count}` : option.label}
      >
        {/* This row owns the only control. Shared Checkbox content preserves the
            indicator, label typography and alignment without another tab stop. */}
        <View style={{ flexShrink: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          <CheckboxVisual checked={checked}>{option.label}</CheckboxVisual>
        </View>
        {option.count != null ? <Badge secondary>{option.count}</Badge> : null}
      </Pressable>
    );
  }

  return function FilterPanel(props: FilterPanelProps) {
    const { groups, activeCount, onClear, onChange, onSelectionChange, bordered, testID, style } = props;
    const density = densityOf(props);

    // Each option's stable key: its explicit `value`, else its group/option index.
    const keyOf = (gi: number, oi: number) => groups[gi].options[oi].value ?? `${gi}:${oi}`;

    // Selection is controllable: `value` drives it (a parent can sync or reset it),
    // otherwise the panel owns it, seeded from `defaultValue` or each option's
    // `checked` flag, so a bare panel toggles filters on press. `onSelectionChange`
    // fires the full set in both modes; `onChange` still fires per-toggle.
    const seededDefault = useMemo<string[]>(() => {
      if (props.defaultValue) return props.defaultValue;
      const seeded: string[] = [];
      groups.forEach((group, gi) =>
        group.options.forEach((option, oi) => {
          if (option.checked) seeded.push(option.value ?? `${gi}:${oi}`);
        }),
      );
      return seeded;
      // Seed is read once by useControllableState on mount; recomputing later is inert.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [selected, setSelected] = useControllableState<string[]>(props.value, seededDefault, onSelectionChange);
    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const isChecked = (gi: number, oi: number) => selectedSet.has(keyOf(gi, oi));
    const toggle = (gi: number, oi: number) => {
      const key = keyOf(gi, oi);
      const next = !selectedSet.has(key);
      setSelected(next ? [...selected, key] : selected.filter((k) => k !== key));
      onChange?.(gi, oi, next);
    };
    const clearAll = () => {
      setSelected([]);
      onClear?.();
    };
    // The header badge tracks the live checked count; an explicit `activeCount`
    // overrides it for callers that manage the number themselves.
    const shownCount = activeCount ?? selectedSet.size;

    // Responsive drawer mode (opt-in): viewport-based like the Sidebar (the
    // Drawer overlays the WINDOW, so the window is the truthful basis here).
    const bucket = useBreakpoint();
    const asDrawer =
      !!props.responsive && bucket !== "base" && breakpoints[bucket] <= breakpoints[props.drawerBreakpoint ?? "sm"];
    const [panelOpen, setPanelOpen] = useControllableState<boolean>(props.open, props.defaultOpen ?? false, props.onOpenChange);
    const theme = useMaterialTheme({ layer: asDrawer ? "functional" : "content" });
    const { tokens } = theme;

    // Under glass the bordered panel is a CONTENT-layer pane (a GlassPane behind the
    // groups; the chrome's fill and hairline drop, the material and rim carry them).
    // Inside the Drawer the drawer's own material is the surface, so the chrome only
    // drops there and no second pane is painted.
    const chrome = bordered ? skin.borderedSurface(tokens) : null;
    const panel = (
      <View
        testID={asDrawer ? undefined : testID}
        style={[
          skin.panelBase,
          // `bordered` wraps it as a rounded card with a border and a card fill;
          // the bare panel keeps the same width but drops the chrome. The radius
          // comes from the skin (per-OS); the border/fill follow the tokens so it
          // tracks light/dark.
          chrome ? paneStyle(theme, chrome) : null,
          skin.panelPad[density],
          skin.panelStack[density],
          style,
        ]}
      >
        {chrome && !asDrawer ? <GlassPane layer="content" shape={chrome} /> : null}
        <View style={skin.headerRow}>
          <View style={skin.titleCluster}>
            <Text style={skin.titleText(tokens)}>Filters</Text>
            {shownCount > 0 ? <Badge secondary>{String(shownCount)}</Badge> : null}
          </View>
          <Button ghost small onPress={clearAll}>
            Clear
          </Button>
        </View>

        {groups.map((group, gi) => (
          <View key={gi} style={[skin.groupColumn, skin.groupGap[density]]}>
            <Text style={skin.groupTitle(tokens)}>{group.title}</Text>
            {/* RippleClip clips the Android bounded-ripple option rows to the bordered
                card's rounded corners (a no-op on iOS/web, and only clips when
                `bordered` so the bare panel keeps rectangular ripples). */}
            <RippleClip
              shape={bordered ? cornerRadii(skin.borderedSurface(tokens)) : undefined}
              style={{ alignSelf: "stretch" }}
            >
            <View style={[skin.groupColumn, skin.groupGap[density]]}>
              {group.options.map((option, oi) => (
                <OptionRow key={keyOf(gi, oi)} option={option} checked={isChecked(gi, oi)} onToggle={() => toggle(gi, oi)} />
              ))}
            </View>
            </RippleClip>
          </View>
        ))}
      </View>
    );

    if (asDrawer) {
      // The kit-owned trigger: an outline Button carrying the live filter count,
      // opening the SAME panel inside a start-edge Drawer. Controlled use goes
      // through `open`/`onOpenChange`; a bare responsive panel self-manages.
      const filtersLabel = shownCount > 0 ? `Filters (${shownCount})` : "Filters";
      return (
        <View testID={testID}>
          <Button outline small onPress={() => setPanelOpen(true)}>
            {filtersLabel}
          </Button>
          <Drawer open={panelOpen} onOpenChange={setPanelOpen}>
            {panel}
          </Drawer>
        </View>
      );
    }

    return panel;
  };
}
