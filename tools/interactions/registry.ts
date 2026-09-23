// An explicit inventory prevents new components from inheriting an assumed pass.
// Empty evidence is reported as unregistered, never as covered or noninteractive.
export const inventory = [
  "view", "text", "pressable", "image", "text-input", "scroll-view", "row-column", "grid", "container", "chip", "emblem", "sparkline", "autocomplete", "avatar", "badge", "breadcrumb", "button-group", "button", "checkbox", "divider", "dropdown", "icon", "input", "pagination", "radio", "reveal", "select", "skeleton", "textarea", "swatch", "switch", "tooltip", "alert", "alert-dialog", "listbox", "card", "code-block", "field", "empty-state", "form", "filter-panel", "board", "calendar", "command", "dashboard-grid", "data-table", "dialog", "drag-drop", "drawer", "sidebar", "steps", "tab-bar", "tabs", "kbd", "typography", "spinner", "progress", "slider", "accordion", "action-sheet", "stepper", "input-otp", "collapsible", "carousel", "toast", "popover", "qrcode", "row-menu", "action-panels", "description-lists", "feeds", "grid-lists", "media-objects", "phone-input", "stacked-lists", "stats", "chart", "line-chart", "area-chart", "pie-chart", "scatter-plot", "candlestick-chart", "depth-chart", "stacked-bar", "gauge", "heatmap", "bar-list", "metric-breakdown", "uptime-bar", "service-health-list", "bullet-chart", "progress-ring", "composed-chart", "range-area-chart", "histogram", "box-plot", "waterfall-chart", "radial-bar-chart", "funnel-chart", "radar-chart", "treemap", "geo-map", "navbars",
];

export interface InteractionEvidence {
  id: string;
  components: string[];
  layer: "unit-web" | "browser-keyboard" | "browser-touch";
  file: string;
  test: string;
}

export const evidence: InteractionEvidence[] = [
  { id: "autocomplete-form-keyboard", components: ["autocomplete", "form"], layer: "browser-keyboard", file: "e2e/journeys/keyboard.e2e.ts", test: "@interaction:autocomplete-form-keyboard" },
  { id: "listbox-keyboard", components: ["listbox"], layer: "browser-keyboard", file: "e2e/journeys/keyboard.e2e.ts", test: "@interaction:listbox-keyboard" },
  { id: "drawer-nested-keyboard", components: ["drawer", "dropdown"], layer: "browser-keyboard", file: "e2e/journeys/keyboard.e2e.ts", test: "@interaction:drawer-nested-keyboard" },
  { id: "autocomplete-touch", components: ["autocomplete"], layer: "browser-touch", file: "e2e/journeys/touch.e2e.ts", test: "@interaction:autocomplete-touch" },
  { id: "listbox-touch", components: ["listbox"], layer: "browser-touch", file: "e2e/journeys/touch.e2e.ts", test: "@interaction:listbox-touch" },
  { id: "drawer-nested-touch", components: ["drawer", "autocomplete"], layer: "browser-touch", file: "e2e/journeys/touch.e2e.ts", test: "@interaction:drawer-nested-touch" },
  { id: "pagination-press", components: ["pagination"], layer: "unit-web", file: "test/behavior.test.tsx", test: "reports the clicked page number" },
  { id: "autocomplete-query", components: ["autocomplete"], layer: "unit-web", file: "test/behavior.test.tsx", test: "is typeable out of the box: keystrokes filter the list (uncontrolled query)" },
  { id: "calendar-selection", components: ["calendar"], layer: "unit-web", file: "test/behavior.test.tsx", test: "reports the clicked day and marks the selected day" },
  { id: "switch-press", components: ["switch"], layer: "unit-web", file: "test/behavior.test.tsx", test: "reports checked on press and reflects aria-checked" },
  { id: "radio-selection", components: ["radio"], layer: "unit-web", file: "test/behavior.test.tsx", test: "selects on press and moves the single selection to the pressed option" },
  { id: "button-group-selection", components: ["button-group"], layer: "unit-web", file: "test/behavior.test.tsx", test: "marks the active segment and reports the pressed index" },
  { id: "listbox-selection", components: ["listbox"], layer: "unit-web", file: "test/behavior.test.tsx", test: "marks the selected item and reports the pressed index" },
  { id: "table-row-press", components: ["data-table"], layer: "unit-web", file: "test/behavior.test.tsx", test: "renders headers and cells and reports the pressed row" },
  { id: "alert-dismiss", components: ["alert"], layer: "unit-web", file: "test/behavior-smoke-a.test.tsx", test: "self-dismisses out of the box when the dismiss control is pressed" },
  { id: "action-panel-toggle", components: ["action-panels"], layer: "unit-web", file: "test/behavior-smoke-b.test.tsx", test: "toggle axis swaps the Button action for a Switch that fires onToggle" },
  { id: "code-copy", components: ["code-block"], layer: "unit-web", file: "test/behavior-smoke-b.test.tsx", test: "copy affordance renders a labelled button and passes the code back on press" },
  { id: "description-edit", components: ["description-lists"], layer: "unit-web", file: "test/behavior-smoke-b.test.tsx", test: "Update opens the in-place editor; committing shows the new value and fires onUpdate" },
  { id: "media-press", components: ["media-objects"], layer: "unit-web", file: "test/behavior-smoke-b.test.tsx", test: "onPress makes the row a button named after its title and fires the handler" },
  { id: "phone-input-country-pick", components: ["phone-input"], layer: "unit-web", file: "test/phone-input.test.tsx", test: "picking a country from the segment's list swaps the dial code and reports the code" },
  { id: "input-password-toggle", components: ["input"], layer: "unit-web", file: "test/input-actions.test.tsx", test: "the eye reveals a masked password and re-masks it" },
  { id: "input-clear", components: ["input"], layer: "unit-web", file: "test/input-actions.test.tsx", test: "the clear button empties the field and reports an empty value" },
];
