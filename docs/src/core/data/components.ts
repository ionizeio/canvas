import type { ComponentDoc } from "./types";

export const COMPONENTS: ComponentDoc[] = [
  // Primitives: the raw React Native building blocks Canvas re-exports
  // (@ionizeio/canvas). Styled with plain RN style objects, identical on every
  // platform. The foundation every higher-level component is built from.
  {
    slug: "view",
    name: "View",
    description: "The layout primitive: a flex container that runs identically on iOS, Android, and the web. Reach for it directly only where no semantic primitive fits: arrangement belongs to Row and Column, which expose direction, gap, alignment and padding as boolean props.",
    category: "Atoms",
  },
  {
    slug: "text",
    name: "Text",
    description: "Renders text. In React Native every string must live inside a Text element; style it with fontSize, fontWeight, and color, and truncate with numberOfLines.",
    category: "Atoms",
  },
  {
    slug: "pressable",
    name: "Pressable",
    description: "The touchable primitive: wraps content, fires onPress, and exposes the press state to its style for feedback. The kit's interactive components (Button, plus the tappable Card, Stats, GridList, MediaObject, and StackedList rows) cover the common cases and keep branding consistent, so prefer them. Pressable stays here for full flexibility when you need a custom interaction the kit doesn't provide; style it with tokens to stay on-brand.",
    category: "Atoms",
  },
  {
    slug: "image",
    name: "Image",
    description: "Displays a local or remote image with a source and a boolean fit prop (cover, contain, stretch, center, repeat, none).",
    category: "Atoms",
  },
  {
    slug: "text-input",
    name: "TextInput",
    description: "Single-line or multiline text entry, controlled with value and onChangeText.",
    category: "Atoms",
  },
  {
    slug: "scroll-view",
    name: "ScrollView",
    description: "A scrollable container for content larger than its bounds; vertical by default, horizontal optional.",
    category: "Atoms",
    // A ScrollView fills its parent by default, so its preview fills the stage width
    // and aligns left. This also gives the width:"100%" examples a definite full-stage
    // width to resolve against (center mode shrink-wraps and would collapse them to 0).
    stageAlign: "start",
  },

  {
    slug: "row-column",
    dir: "layout",
    name: "Row & Column",
    description: "The layout primitives. Row lays children out horizontally, Column vertically, with a semantic gap scale (flush / tight / snug / cozy / relaxed / loose), main-axis distribution (center, between), cross-axis alignment (alignCenter, baseline), and wrap / fill / grow, so a call site never hand-rolls flexDirection, gap, or alignItems.",
    category: "Atoms",
    // A Row or Column is a layout container, so its examples show how children share
    // a width. The stretched stage IS that width: in center mode a bare Row shrink-wraps
    // its children and center / between / wrap / span have nothing to distribute over.
    stageAlign: "start",
  },

  {
    slug: "container",
    name: "Container",
    description: "The bounds provider. A component never dictates its own width; Container conforms to its parent (full width, no cap) by default, and a named step of the shared width scale (xxxs 192 through page 1280) caps and centers it, so a form, an article, or a card stack has a measure you can name instead of a width invented at the call site. start pins a capped box to the leading edge, and the pad scale adds horizontal gutters.",
    category: "Atoms",
    // Container caps and centers itself inside its parent, so its examples need the
    // stage's full width as that parent: in center mode a Column of Containers
    // shrink-wraps and every step collapses to its own content.
    stageAlign: "start",
  },

  {
    slug: "grid",
    name: "Grid",
    description: "The container-measured auto-fit tile grid. minTileWidth sets the floor (default 240): the grid fits as many equal-width columns of at least that width as its own container allows and re-fits as the container changes, columns caps the desktop count, the gap scale is Row and Column's own, and a GridItem with wide spans two cells. No breakpoints at the call site: three-up on desktop, one column on a phone, by container math alone.",
    category: "Atoms",
  },

  {
    slug: "chip",
    name: "Chip",
    description: "An interactive pill: filter chips, tags, and selectable tokens. A low-emphasis tag: the quiet surface pill, or a coloured soft pill, with an optional leading icon and label, tappable with onPress, and a trailing × remove button with onRemove; a selected filter chip is the solid primary. Color is a boolean axis: semantic status (success / warning / destructive / info / neutral) or a free-form palette hue (red … rose, gray); outline and primary set the emphasis.",
    category: "Atoms",
  },

  {
    slug: "emblem",
    name: "Emblem",
    description: "A tinted rounded square (or circle) that holds a single Icon or a short monogram, the recurring icon-on-a-soft-background used in cards, media objects, empty states, and feeds. A tone tints the square and paints the glyph to match, so no call site hand-composes the icon background.",
    category: "Atoms",
  },

  {
    slug: "sparkline",
    name: "Sparkline",
    description: "A compact trend strip: a row of thin bars whose heights track a series of values, with the series in a soft wash of the tone and the latest bar in the full accent. Pass values and it sizes each bar against the series max and paints the tone, so no call site hand-composes a row of flexGrow + height Views to draw an inline trend on a stat card or dashboard.",
    category: "Charts",
  },

  {
    slug: "autocomplete",
    name: "Autocomplete",
    description: "Text input + dropdown: searchable single-select. On the web, and on iOS, which ships no autocomplete control, it is Dark Factory's field and menu, the Select's: a translucent well, a 13px semibold value, an uppercase eyebrow label, and suggestions with the chosen one in violet beside a checkmark. Android keeps the Material 3 exposed dropdown.",
    category: "Atoms",
    // A field fills its parent either way; the stretched stage makes the parent the
    // stage itself, so the "Measure" Column of stepped fields and Container steps
    // has a definite width to hand down (in center mode it shrink-wraps and every
    // step collapses to the field's own content).
    stageAlign: "start",
  },

  {
    slug: "avatar",
    name: "Avatar",
    description: "A photo when the account has one, falling back to one or two initials on an identity disc: the name resolves to one of ten hues, and the disc is that hue's diagonal blend from a pale tint to a deeper, warmer neighbour, so one person keeps one colour on every platform and stays distinct in a stack or list. The initials are bold, about a third of the disc, in near-black, which holds 4.5:1 on both ends of every blend.",
    category: "Atoms",
  },

  {
    slug: "badge",
    name: "Badge",
    description: "Two families on one Badge component, picked by boolean props, both Dark Factory's pill. The metadata badge labels a schema, role, or tag (tones: <code>secondary</code>, the quiet surface pill and the default; <code>default</code>, the solid call-to-action pill; <code>outline</code>, a hairline pill; <code>destructive</code>, the soft red pill; add <code>mono</code> for token names). The status badge (<code>status</code>) is Dark Factory's live-state pill for state like active, pending, or failed: a quiet pill whose leading dot carries the tone (success, warning, error, info, neutral) beside a label in the foreground.",
    category: "Atoms",
  },

  {
    slug: "breadcrumb",
    name: "Breadcrumb",
    description: "Hierarchical navigation showing where you are.",
    category: "Atoms",
    // A breadcrumb is a full-width nav trail read from the leading edge, so its
    // preview fills the row and aligns left rather than floating in the center.
    stageAlign: "start",
  },

  {
    slug: "button-group",
    name: "ButtonGroup",
    description: "Segmented controls, split buttons, attached groups.",
    category: "Atoms",
  },

  {
  slug: "button",
  name: "Button",
  description: "Six intents × three sizes (plus the icon square) × disabled / focus / hover states. Always semantic: the intent communicates what the button does (default = the primary action, destructive = irreversible, ghost = chrome). On the web every intent is a pill: the green call to action, a violet outline for secondary, a hairline outline, and bare ghost and link buttons.",
  category: "Atoms",
},

  {
    slug: "checkbox",
    name: "Checkbox",
    description: "Multi-select option, single yes/no, grouped lists.",
    category: "Atoms",
  },

  {
    slug: "divider",
    name: "Divider",
    description: "Horizontal, vertical, with label, with action.",
    category: "Atoms",
    stageAlign: "start",
  },

  {
    slug: "dropdown",
    name: "Dropdown",
    description: "Floating menus triggered by a button: actions, options, navigation.",
    category: "Atoms",
  },

  {
    slug: "icon",
    name: "Icon",
    description: "Lucide-style outline. 1.75 stroke width, rounded caps. Inherits currentColor, so the same icon adapts to any context: set the color on the parent.",
    category: "Atoms",
  },

  {
    slug: "input",
    name: "Input",
    description: "The Input component is a React Native text field with semantic boolean props (<code>error</code>, <code>small</code>, <code>large</code>, <code>disabled</code>), plus prefix/suffix addons, overlaid icons (any Canvas glyph as <code>icon</code>), a <code>passwordToggle</code> eye for a masked value, and a <code>clearable</code> clear button. Input is single-line; for multi-line entry use the dedicated Textarea. A field fills the parent it is given; a step of its own (<code>xs</code>, <code>lg</code>, …, <code>start</code> to pin it) or a Container step sets its measure. On the web it is Dark Factory's field: a translucent well whose hairline turns violet on focus, a 13px semibold value and an uppercase eyebrow label. iOS draws it to the iOS input-field reference and Android keeps the Material 3 filled field. Form stitches labeled inputs into a full form.",
    category: "Atoms",
    // A field fills its parent either way; the stretched stage makes the parent the
    // stage itself, so the "Measure" Column of stepped fields and Container steps
    // has a definite width to hand down (in center mode it shrink-wraps and every
    // step collapses to the field's own content).
    stageAlign: "start",
  },

  {
    slug: "pagination",
    name: "Pagination",
    description: "Page-of-N navigation for tables and lists.",
    category: "Atoms",
  },

  {
    slug: "radio",
    name: "Radio",
    description: "Single-pick selection: stacked, inline, card-style.",
    category: "Atoms",
  },

  {
    slug: "reveal",
    name: "Reveal",
    description: "Scroll-triggered entrance for content, with structural stagger.",
    category: "Atoms",
  },

  {
    slug: "select",
    name: "Select",
    description: "A pop-up field for picking one option from a list. On the web it is Dark Factory's Select: the Input's translucent well with a chevron and an uppercase eyebrow label, opening Dark Factory's menu with the chosen option in violet beside a checkmark. iOS keeps its pop-up button and the menu's leading check, and Android the Material 3 exposed dropdown.",
    category: "Atoms",
    // A field fills its parent either way; the stretched stage makes the parent the
    // stage itself, so the "Measure" Column of stepped fields and Container steps
    // has a definite width to hand down (in center mode it shrink-wraps and every
    // step collapses to the field's own content).
    stageAlign: "start",
  },

  {
    slug: "skeleton",
    name: "Skeleton",
    description: "Placeholders for loading content.",
    category: "Atoms",
    // Placeholders stand in for real content, which fills its container and reads
    // from the leading edge, so the stage fills its width and pins the example left
    // rather than floating it centered: the card scaffold spans the full width, and
    // the composite list/table shapes expand to their own caps instead of collapsing.
    stageAlign: "start",
  },

  {
    slug: "textarea",
    name: "Textarea",
    description: "Multi-line input, with character count, with toolbar. On the web it is Dark Factory's field, the Input's.",
    category: "Atoms",
    // A field fills its parent either way; the stretched stage makes the parent the
    // stage itself, so the "Measure" Column of stepped fields and Container steps
    // has a definite width to hand down (in center mode it shrink-wraps and every
    // step collapses to the field's own content).
    stageAlign: "start",
  },

  {
    slug: "swatch",
    name: "Swatch",
    description: "A color sample: a filled rounded block with the token's name and mono value beneath it, the anatomy a design-system color sheet repeats. Swatch owns the label column, so a sheet never sets a bare block beside a hand-built text column. A hairline edge keeps a white or near-black sample visible on the surface behind it. Sizes, circle, inline (label beside the block), and block (a full-width ramp bar).",
    category: "Atoms",
    // A color sheet reads from the leading edge, and the `block` variant is a
    // full-width ramp bar, so the stage fills its width and pins the example left
    // instead of shrink-wrapping it centered (which would collapse `block` to the
    // width of its own label).
    stageAlign: "start",
  },

  {
    slug: "switch",
    name: "Switch",
    description: "On / off switch, isolated or grouped in a settings list.",
    category: "Atoms",
  },

  {
    slug: "tooltip",
    name: "Tooltip",
    description: "Small floating helper text on hover or focus.",
    category: "Atoms",
  },

  {
    slug: "alert",
    name: "Alert",
    description: "Inline notification banners: info, success, warning, and destructive, plus a full-width announcement bar. For a blocking confirmation prompt, see Alert Dialog.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "alert-dialog",
    name: "AlertDialog",
    description: "Catalyst-style confirmation dialog: a centered panel over a dimmed, blurred backdrop, with a title, description, optional body, and action buttons. Reserve it for decisions that must block the rest of the app.",
    category: "Molecules",
  },

  {
    slug: "listbox",
    name: "Listbox",
    description: "A custom (non-native) select: single or multi-select, optional avatars or icons per option, and a checkmark on the chosen items. Reach for it when a native select can't show rich options; prefer a native select for simple short lists.",
    category: "Atoms",
    stageAlign: "start",
  },

  {
    slug: "card",
    name: "Card",
    description: "Three families. <code>StatCard</code> = a single metric, big number + delta. <code>SectionCard</code> = a labeled content surface with optional header and divider. Generic <code>card</code> = bring your own structure. Density: pass <code>compact</code> or <code>comfortable</code> to tighten or relax the card's own padding and the gap between flat children (<code>compact</code> takes precedence, and a density prop pads the surface on its own).",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "code-block",
    name: "CodeBlock",
    description:
      "Syntax-highlighted code display with clipboard copy, line emphasis, diffs, collapsible folding, and tabbed alternatives.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "field",
    name: "Field",
    description: "A form row: a label, the control, and one message line under it. Field owns the helper and error text no control renders on its own, and hands its label down to a wrapped field-family control so each platform still places it its own way: Dark Factory's uppercase eyebrow above on the web, a static title above on iOS, the floating in-container label on Android.",
    category: "Molecules",
    stageAlign: "start",
  },
  {
    slug: "empty-state",
    name: "EmptyState",
    description: "Centered, calm, never blame the user. Always tell them what could be here, and ideally how to get there.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "form",
    name: "Form",
    description: "Stitch your own field atoms inside it; Form adds the stacked or two-column rhythm, titled sections, and the submit/cancel actions row. On the web and Android it takes Dark Factory's form: rows 18px apart, two columns from 414px, and a ghost cancel beside the raised primary submit; iOS keeps its SF section type and roomier rhythm.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "filter-panel",
    name: "FilterPanel",
    description: "Sidebar filter rail: grouped checkbox options with count badges and a Clear header.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "board",
    name: "Board",
    description: "A data-driven kanban board: columns scroll horizontally, each column is a drop zone, and every card carries a drag grip, an optional badge, a chips slot, and a kebab menu. Built on the kit's own drag-and-drop, so a move works by pointer or keyboard on iOS, Android, and the web, and each drop reports a BoardMove (index plus afterId/beforeId neighbors) while the items array stays controlled by the consumer.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "calendar",
    name: "Calendar",
    description: "Month grid, week timeline, and day timeline with events: dots mark event days, timed events render as blocks on the hour timelines.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "command",
    name: "Command",
    description: "Cmd+K search: navigation, actions, recent items. No platform ships a command palette, so every platform draws Dark Factory's: its menu panel at the dialog corner, a search field over menu rows and eyebrow headings, and a field-framed trigger.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "dashboard-grid",
    name: "DashboardGrid",
    description: "A 12-column widget board for overview screens: every widget declares a span in twelfths, and the grid measures its own width to reflow them through a wide, narrow, and phone tier. Cells render bare, so a widget arrives with its own surface. Locked it is a plain static grid; unlocked it turns into customize mode, where the kit's own drag-and-drop reorders the board by pointer, keyboard, or screen reader and reports the new id order.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "data-table",
    name: "DataTable",
    description: "Sortable, selectable, paginated data table with the loading and empty states built in. Columns are labels or descriptors (alignment, fixed widths, sort). Density tweaks affect padding live.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "dialog",
    name: "Dialog",
    description: "A modal dialog: a centered panel over a dimmed, blurred backdrop, with a title, an optional description, a body for real content like a form, and right-aligned actions. Use it for a focused task that warrants interrupting the page; reach for the Alert Dialog for a terse yes/no confirmation.",
    category: "Organisms",
  },
  {
    slug: "drag-drop",
    name: "Drag & drop",
    description: "A reusable drag-and-drop context: wrap a surface in a DragDropProvider, mark droppable regions with DropZone, and make items draggable with Draggable plus a DragHandle grip. Cards lift into a floating ghost and reorder within or across zones, position-aware. Built from PanResponder and Animated so it runs on iOS, Android, and the web with no platform forks, and it is fully keyboard- and screen-reader-operable (Space to grab, arrows to move, Space to drop, Escape to cancel).",
    category: "Organisms",
    // A drop zone is a layout container that fills its parent; the stretched stage
    // is that parent, so the zones and their cards span the stage instead of
    // hugging a card's label in center mode.
    stageAlign: "start",
  },
  {
    slug: "drawer",
    name: "Drawer",
    description: "A full-screen panel that slides in from an edge: a navigation drawer, a mobile menu, or a bottom action sheet. Built on React Native's Modal so it floats over the whole app on iOS, Android, and the web. For a small contextual menu, reach for Dropdown or RowMenu instead.",
    category: "Organisms",
  },

  {
    slug: "sidebar",
    name: "Sidebar",
    description: "App navigation rail with collapsible sections and single active highlighting. Add `responsive` and it becomes a start-edge drill-down Liquid Glass menu on a phone. The sidebar on the left of this page is a thin adapter over this very component.",
    category: "Organisms",
    stageAlign: "start",
    singlePreview: true,
  },

  {
    slug: "steps",
    name: "Steps",
    description: "Multi-step progress indicators: horizontal, vertical, with progress.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "tab-bar",
    name: "TabBar",
    description: "Bottom app navigation: a row of equal-width destinations, each an icon over a short label, with exactly one active. The mobile idiom (iOS HIG tab bar / Material 3 navigation bar), rendered through the glass functional layer.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "tabs",
    name: "Tabs",
    description: "Underline, pill, vertical, with badges.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "kbd",
    name: "Kbd",
    description: "Keyboard shortcut indicator badge.",
    category: "Atoms",
  },

  {
    slug: "typography",
    name: "Typography",
    description: "Type scale classes for headings, body text, and helper styles.",
    category: "Atoms",
  },
  {
    slug: "video",
    name: "Video",
    description: "Plays a clip with a poster: tap to play inline, or full transport controls (the platform's own on iOS and Android, the kit's bar on the web), with boolean fit, autoplay, loop and muted props.",
    category: "Atoms",
  },

  {
    slug: "spinner",
    name: "Spinner",
    description: "Animated loading spinner in three sizes.",
    category: "Atoms",
  },

  {
    slug: "progress",
    name: "Progress",
    description: "Determinate and indeterminate progress bars.",
    category: "Atoms",
    stageAlign: "start",
  },

  {
    slug: "slider",
    name: "Slider",
    description: "A draggable value/range input with keyboard and screen-reader support.",
    category: "Atoms",
    stageAlign: "start",
  },

  {
    slug: "accordion",
    name: "Accordion",
    description: "A vertically stacked set of collapsible disclosure panels.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "action-sheet",
    name: "ActionSheet",
    description: "A modal sheet of contextual actions (the iOS action sheet idiom).",
    category: "Organisms",
  },

  {
    slug: "stepper",
    name: "Stepper",
    description: "A ± numeric control: − and + buttons around an editable field, clamped to a range (the iOS UIStepper idiom). For a multi-step progress indicator, see Steps.",
    category: "Atoms",
  },

  {
    slug: "input-otp",
    name: "InputOTP",
    description: "A segmented one-time-code field driven by one input, with SMS autofill and paste. No platform ships one, so every platform draws Dark Factory's field in each cell: a translucent well whose hairline turns violet where the next character lands, and a blinking caret.",
    category: "Atoms",
  },

  {
    slug: "collapsible",
    name: "Collapsible",
    description: "A single disclosure: a header that toggles one collapsible content panel.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "carousel",
    name: "Carousel",
    description: "A horizontally paged slide viewer with snap paging, dot indicators, and optional arrows.",
    category: "Organisms",
    stageAlign: "start",
  },

  {
    slug: "toast",
    name: "Toast",
    description: "A transient notification capsule, rendered directly or driven imperatively via a ToastProvider and the useToast hook.",
    category: "Organisms",
  },

  {
    slug: "popover",
    name: "Popover",
    description: "Floating panel for rich content triggered by a click.",
    category: "Atoms",
  },
  {
    slug: "qrcode",
    name: "QRCode",
    description: "Encodes a string as a scannable QR code. Built on react-native-svg, so it renders the same on iOS, Android, and the web, and stays a fixed dark-on-white card for reliable scanning.",
    category: "Atoms",
  },

  {
    slug: "row-menu",
    name: "RowMenu",
    description: "Vertical action menu items and navigation links.",
    category: "Organisms",
  },

  {
    slug: "action-panels",
    name: "ActionPanel",
    description: "Section card with headline, body text, and a primary action. Used to surface a single decision or call-to-action.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "description-lists",
    name: "DescriptionList",
    description: "Key-value pairs in stacked, two-column, or inline-edit layouts. Used for detail panels, settings, and profile views. Rows flagged <code>update</code> carry a working in-place editor: Update opens it, Enter or Save commits the new value (firing <code>onUpdate</code>), Escape or Cancel dismisses it.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "feeds",
    name: "Feed",
    description: "Vertical activity streams with icons and timestamps. Used for audit logs, change history, and notification lists.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "grid-lists",
    name: "GridList",
    description: "Tiled card grids for people directories, item collections, and image galleries.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "media-objects",
    name: "MediaObject",
    description: "Image or icon paired with text content. The fundamental building block for list items, notifications, and comment layouts.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "phone-input",
    name: "PhoneInput",
    description: "A phone number field: the Input's box with a country segment at its start (the chosen country's flag and a caret that open a list of countries with their dial codes) and that country's dial code inline before the number. Controlled or uncontrolled for both the country and the number; Field delegates its label and error into it. On the web the box is Dark Factory's field and the country list its menu.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "stacked-lists",
    name: "StackedList",
    description: "Vertical lists with avatar, two-line items, and trailing metadata. Used for contacts, activity feeds, and data previews.",
    category: "Molecules",
    stageAlign: "start",
  },

  {
    slug: "stats",
    name: "Stats",
    description: "Single value, grouped row, with sparkline, with comparison. Used for dashboards and overview pages.",
    category: "Molecules",
    stageAlign: "start",
  },

  // Charts: the data-viz tier. One component per chart type, all sharing the
  // token-themed frame, the colorblind-validated chart-1..8 series palette,
  // and scrub-to-inspect. No charting library required.
  {
    slug: "chart",
    name: "Chart",
    description: "Single- or multi-series bar chart: vertical columns or horizontal rows, grouped clusters via labels + series, press or scrub a category to inspect it.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "line-chart",
    name: "LineChart",
    description: "Categorical-x series lines with monotone curves, dot markers, and the trading price idiom: a dashed baseline with gain/loss auto-toning and a gradient fade.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "area-chart",
    name: "AreaChart",
    description: "Series fills: overlapping translucent areas, or running-sum bands with stacked. Shares the line chart's curve, density, and inspect axes.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "pie-chart",
    name: "PieChart",
    description: "Proportional arc slices with a percent legend; donut centers the total, and pressing a slice dims the rest and swaps the center readout.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "scatter-plot",
    name: "ScatterPlot",
    description: "Numeric x/y point clouds with nice ticks and gridlines on both axes; pressing near a point rings it and flags its coordinates.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "candlestick-chart",
    name: "CandlestickChart",
    description: "OHLC candles colored by direction, an optional docked volume pane, and moving-average overlays. Scrub to read Open/High/Low/Close and volume.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "depth-chart",
    name: "DepthChart",
    description: "The order-book view: cumulative bid and ask step areas mirrored around the spread on a numeric price axis.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "stacked-bar",
    name: "StackedBar",
    description: "One proportional bar split into colored segments with a legend carrying each share.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "gauge",
    name: "Gauge",
    description: "A radial dial: muted track, tone-colored fill arc, and the value centered inside.",
    category: "Charts",
  },
  {
    slug: "heatmap",
    name: "Heatmap",
    description: "Density cells whose fill encodes each value. A `calendar` layout gives a GitHub-style contribution graph with weekday and month labels and inspect-on-hover.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "bar-list",
    name: "BarList",
    description: "Ranked label and value rows with proportional track bars, Stats-style deltas, share percents, and drill-in presses.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "metric-breakdown",
    name: "MetricBreakdown",
    description: "The decomposed-metric dashboard card: headline value, tone-aware rate, Sparkline trend, per-category share rows, and a chip footer.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "uptime-bar",
    name: "UptimeBar",
    description: "The statuspage strip: per-period status pills (operational, degraded, down, unknown) with a summary caption and edge labels.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "service-health-list",
    name: "ServiceHealthList",
    description: "Per-service status rows: a status dot, the service name, a right-aligned detail, and an embedded mini uptime strip.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "bullet-chart",
    name: "BulletChart",
    description: "Goal-attainment rows: qualitative background bands, the measure bar, and a target tick, all on one shared scale.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "progress-ring",
    name: "ProgressRing",
    description: "A full-circle completion ring: muted track, tone-colored arc from 12 o'clock, and the percent readout centered inside.",
    category: "Charts",
  },
  {
    slug: "composed-chart",
    name: "ComposedChart",
    description: "Bars, lines, and gradient-washed areas on one categorical axis: each series picks its mark.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "range-area-chart",
    name: "RangeAreaChart",
    description: "A min/max envelope band with an optional mid line, for forecasts, error bands, and daily ranges.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "histogram",
    name: "Histogram",
    description: "An auto-binned frequency distribution: pass raw samples and the chart draws nice-edged bins on a numeric axis.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "box-plot",
    name: "BoxPlot",
    description: "Quartile boxes, whiskers, and outlier dots per category, computed from raw samples with the Tukey five-number summary.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "waterfall-chart",
    name: "WaterfallChart",
    description: "The running-total bridge: rises green, falls red, totals primary, with hairline connectors between steps.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "radial-bar-chart",
    name: "RadialBarChart",
    description: "Concentric arc rings, one per category, each revealed from 12 o'clock over a muted track, with a value legend.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "funnel-chart",
    name: "FunnelChart",
    description: "Stage-by-stage conversion trapezoids with on-stage labels, values, and conversion percents.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "radar-chart",
    name: "RadarChart",
    description: "A polygonal multi-axis comparison: nice-tick rings, a spoke per axis, and a washed polygon per series.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "treemap",
    name: "Treemap",
    description: "Squarified value tiles: each datum's area is proportional to its value, labeled when the tile fits it.",
    category: "Charts",
    stageAlign: "start",
  },
  {
    slug: "geo-map",
    name: "GeoMap",
    description: "A world map with a bubble per place, its area proportional to the count, over precomputed coastlines and country borders. Optionally zoomable, aggregating crowded places into one bubble that splits as you zoom in.",
    category: "Charts",
    stageAlign: "start",
  },

  {
    slug: "navbars",
    name: "Navbar",
    description: "Topbars with navigation links, search, and action buttons. Used as the primary app-level navigation.",
    category: "Organisms",
    stageAlign: "start",
  },
];

export function getComponent(slug: string): ComponentDoc | undefined {
  return COMPONENTS.find((c) => c.slug === slug);
}

export function getComponentsByCategory(category: string): ComponentDoc[] {
  return COMPONENTS.filter((c) => c.category === category);
}
