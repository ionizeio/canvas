// The registry of components that ship platform skins, ported from the web docs'
// platform-components.ts. The WEB docs preview the iOS and Android skins by importing
// the real `.ios`/`.android` files by LITERAL path (a bare/barrel import only ever
// resolves the web file in a browser bundler). This table is used ONLY on the web
// build (see build-scopes.web.tsx); on a real device Metro resolves these files
// automatically by platform extension, so build-scopes.native.tsx never imports it.

import { Switch as SwitchIOS } from "../../../src/atoms/switch/switch.ios.js";
import { Switch as SwitchAndroid } from "../../../src/atoms/switch/switch.android.js";
import { Button as ButtonIOS } from "../../../src/atoms/button/button.ios.js";
import { Button as ButtonAndroid } from "../../../src/atoms/button/button.android.js";
import { Checkbox as CheckboxIOS } from "../../../src/atoms/checkbox/checkbox.ios.js";
import { Checkbox as CheckboxAndroid } from "../../../src/atoms/checkbox/checkbox.android.js";
import { Listbox as ListboxIOS } from "../../../src/atoms/listbox/listbox.ios.js";
import { Listbox as ListboxAndroid } from "../../../src/atoms/listbox/listbox.android.js";
import { Radio as RadioIOS, RadioGroup as RadioGroupIOS } from "../../../src/atoms/radio/radio.ios.js";
import { Radio as RadioAndroid, RadioGroup as RadioGroupAndroid } from "../../../src/atoms/radio/radio.android.js";
import { Input as InputIOS } from "../../../src/atoms/input/input.ios.js";
import { Input as InputAndroid } from "../../../src/atoms/input/input.android.js";
import { Textarea as TextareaIOS } from "../../../src/atoms/textarea/textarea.ios.js";
import { Textarea as TextareaAndroid } from "../../../src/atoms/textarea/textarea.android.js";
import { ButtonGroup as ButtonGroupIOS } from "../../../src/atoms/button-group/button-group.ios.js";
import { ButtonGroup as ButtonGroupAndroid } from "../../../src/atoms/button-group/button-group.android.js";
import { Select as SelectIOS } from "../../../src/atoms/select/select.ios.js";
import { Select as SelectAndroid } from "../../../src/atoms/select/select.android.js";
import { Autocomplete as AutocompleteIOS } from "../../../src/atoms/autocomplete/autocomplete.ios.js";
import { Autocomplete as AutocompleteAndroid } from "../../../src/atoms/autocomplete/autocomplete.android.js";
import { Dropdown as DropdownIOS } from "../../../src/atoms/dropdown/dropdown.ios.js";
import { Dropdown as DropdownAndroid } from "../../../src/atoms/dropdown/dropdown.android.js";
import { Popover as PopoverIOS } from "../../../src/atoms/popover/popover.ios.js";
import { Popover as PopoverAndroid } from "../../../src/atoms/popover/popover.android.js";
import { Tooltip as TooltipIOS } from "../../../src/atoms/tooltip/tooltip.ios.js";
import { Tooltip as TooltipAndroid } from "../../../src/atoms/tooltip/tooltip.android.js";
import { RowMenu as RowMenuIOS } from "../../../src/organisms/row-menu/row-menu.ios.js";
import { RowMenu as RowMenuAndroid } from "../../../src/organisms/row-menu/row-menu.android.js";
import { Dialog as DialogIOS } from "../../../src/organisms/dialog/dialog.ios.js";
import { Dialog as DialogAndroid } from "../../../src/organisms/dialog/dialog.android.js";
import { AlertDialog as AlertDialogIOS } from "../../../src/molecules/alert-dialog/alert-dialog.ios.js";
import { AlertDialog as AlertDialogAndroid } from "../../../src/molecules/alert-dialog/alert-dialog.android.js";
import { Spinner as SpinnerIOS } from "../../../src/atoms/spinner/spinner.ios.js";
import { Spinner as SpinnerAndroid } from "../../../src/atoms/spinner/spinner.android.js";
import { TabBar as TabBarIOS } from "../../../src/organisms/tab-bar/tab-bar.ios.js";
import { TabBar as TabBarAndroid } from "../../../src/organisms/tab-bar/tab-bar.android.js";
import { Tabs as TabsIOS } from "../../../src/organisms/tabs/tabs.ios.js";
import { Tabs as TabsAndroid } from "../../../src/organisms/tabs/tabs.android.js";
import { Steps as StepsIOS } from "../../../src/organisms/steps/steps.ios.js";
import { Steps as StepsAndroid } from "../../../src/organisms/steps/steps.android.js";
import { Navbar as NavbarIOS } from "../../../src/organisms/navbars/navbars.ios.js";
import { Navbar as NavbarAndroid } from "../../../src/organisms/navbars/navbars.android.js";
import { Sidebar as SidebarIOS } from "../../../src/organisms/sidebar/sidebar.ios.js";
import { Sidebar as SidebarAndroid } from "../../../src/organisms/sidebar/sidebar.android.js";
import { Calendar as CalendarIOS } from "../../../src/organisms/calendar/calendar.ios.js";
import { Calendar as CalendarAndroid } from "../../../src/organisms/calendar/calendar.android.js";
import { Board as BoardIOS } from "../../../src/organisms/board/board.ios.js";
import { Board as BoardAndroid } from "../../../src/organisms/board/board.android.js";
import { Avatar as AvatarIOS, AvatarGroup as AvatarGroupIOS, AvatarMenu as AvatarMenuIOS } from "../../../src/atoms/avatar/avatar.ios.js";
import { Avatar as AvatarAndroid, AvatarGroup as AvatarGroupAndroid, AvatarMenu as AvatarMenuAndroid } from "../../../src/atoms/avatar/avatar.android.js";
import { Breadcrumb as BreadcrumbIOS, BreadcrumbItem as BreadcrumbItemIOS } from "../../../src/atoms/breadcrumb/breadcrumb.ios.js";
import { Breadcrumb as BreadcrumbAndroid, BreadcrumbItem as BreadcrumbItemAndroid } from "../../../src/atoms/breadcrumb/breadcrumb.android.js";
import { Slider as SliderIOS } from "../../../src/atoms/slider/slider.ios.js";
import { Slider as SliderAndroid } from "../../../src/atoms/slider/slider.android.js";
import { Progress as ProgressIOS } from "../../../src/atoms/progress/progress.ios.js";
import { Progress as ProgressAndroid } from "../../../src/atoms/progress/progress.android.js";
import { Accordion as AccordionIOS } from "../../../src/molecules/accordion/accordion.ios.js";
import { Accordion as AccordionAndroid } from "../../../src/molecules/accordion/accordion.android.js";
import { ActionSheet as ActionSheetIOS } from "../../../src/organisms/action-sheet/action-sheet.ios.js";
import { ActionSheet as ActionSheetAndroid } from "../../../src/organisms/action-sheet/action-sheet.android.js";
import { ActionPanel as ActionPanelIOS } from "../../../src/molecules/action-panels/action-panels.ios.js";
import { ActionPanel as ActionPanelAndroid } from "../../../src/molecules/action-panels/action-panels.android.js";
import { Card as CardIOS, CardMedia as CardMediaIOS } from "../../../src/molecules/card/card.ios.js";
import { Card as CardAndroid, CardMedia as CardMediaAndroid } from "../../../src/molecules/card/card.android.js";
import { DescriptionList as DescriptionListIOS } from "../../../src/molecules/description-lists/description-lists.ios.js";
import { DescriptionList as DescriptionListAndroid } from "../../../src/molecules/description-lists/description-lists.android.js";
import { Field as FieldIOS } from "../../../src/molecules/field/field.ios.js";
import { Field as FieldAndroid } from "../../../src/molecules/field/field.android.js";
import { EmptyState as EmptyStateIOS } from "../../../src/molecules/empty-state/empty-state.ios.js";
import { EmptyState as EmptyStateAndroid } from "../../../src/molecules/empty-state/empty-state.android.js";
import { Feed as FeedIOS } from "../../../src/molecules/feeds/feeds.ios.js";
import { Feed as FeedAndroid } from "../../../src/molecules/feeds/feeds.android.js";
import { Form as FormIOS, FormSection as FormSectionIOS } from "../../../src/molecules/form/form.ios.js";
import { Form as FormAndroid, FormSection as FormSectionAndroid } from "../../../src/molecules/form/form.android.js";
import { GridList as GridListIOS } from "../../../src/molecules/grid-lists/grid-lists.ios.js";
import { GridList as GridListAndroid } from "../../../src/molecules/grid-lists/grid-lists.android.js";
import { MediaObject as MediaObjectIOS } from "../../../src/molecules/media-objects/media-objects.ios.js";
import { MediaObject as MediaObjectAndroid } from "../../../src/molecules/media-objects/media-objects.android.js";
import { PhoneInput as PhoneInputIOS } from "../../../src/molecules/phone-input/phone-input.ios.js";
import { PhoneInput as PhoneInputAndroid } from "../../../src/molecules/phone-input/phone-input.android.js";
import { StackedList as StackedListIOS } from "../../../src/molecules/stacked-lists/stacked-lists.ios.js";
import { StackedList as StackedListAndroid } from "../../../src/molecules/stacked-lists/stacked-lists.android.js";
import { Stats as StatsIOS } from "../../../src/molecules/stats/stats.ios.js";
import { Stats as StatsAndroid } from "../../../src/molecules/stats/stats.android.js";
import { Command as CommandIOS } from "../../../src/organisms/command/command.ios.js";
import { Command as CommandAndroid } from "../../../src/organisms/command/command.android.js";
import { DataTable as DataTableIOS } from "../../../src/organisms/data-table/data-table.ios.js";
import { DataTable as DataTableAndroid } from "../../../src/organisms/data-table/data-table.android.js";
import { Drawer as DrawerIOS } from "../../../src/organisms/drawer/drawer.ios.js";
import { Drawer as DrawerAndroid } from "../../../src/organisms/drawer/drawer.android.js";
import { FilterPanel as FilterPanelIOS } from "../../../src/organisms/filter-panel/filter-panel.ios.js";
import { FilterPanel as FilterPanelAndroid } from "../../../src/organisms/filter-panel/filter-panel.android.js";
import { Stepper as StepperIOS } from "../../../src/atoms/stepper/stepper.ios.js";
import { Stepper as StepperAndroid } from "../../../src/atoms/stepper/stepper.android.js";
import { InputOTP as InputOTPIOS } from "../../../src/atoms/input-otp/input-otp.ios.js";
import { InputOTP as InputOTPAndroid } from "../../../src/atoms/input-otp/input-otp.android.js";
import { Collapsible as CollapsibleIOS } from "../../../src/molecules/collapsible/collapsible.ios.js";
import { Collapsible as CollapsibleAndroid } from "../../../src/molecules/collapsible/collapsible.android.js";
import { Carousel as CarouselIOS } from "../../../src/organisms/carousel/carousel.ios.js";
import { Carousel as CarouselAndroid } from "../../../src/organisms/carousel/carousel.android.js";
import { Toast as ToastAndroid, ToastProvider as ToastProviderAndroid, useToast as useToastAndroid } from "../../../src/organisms/toast/toast.android.js";
import { Chip as ChipAndroid } from "../../../src/atoms/chip/chip.android.js";
import { DragDropProvider as DragDropProviderIOS, DropZone as DropZoneIOS, Draggable as DraggableIOS, DragHandle as DragHandleIOS } from "../../../src/organisms/drag-drop/drag-drop.ios.js";
import { DragDropProvider as DragDropProviderAndroid, DropZone as DropZoneAndroid, Draggable as DraggableAndroid, DragHandle as DragHandleAndroid } from "../../../src/organisms/drag-drop/drag-drop.android.js";
import { DashboardGrid as DashboardGridIOS } from "../../../src/organisms/dashboard-grid/dashboard-grid.ios.js";
import { DashboardGrid as DashboardGridAndroid } from "../../../src/organisms/dashboard-grid/dashboard-grid.android.js";
import { MetricBreakdown as MetricBreakdownIOS } from "../../../src/charts/metric-breakdown/metric-breakdown.ios.js";
import { MetricBreakdown as MetricBreakdownAndroid } from "../../../src/charts/metric-breakdown/metric-breakdown.android.js";
import { GeoMap as GeoMapIOS } from "../../../src/charts/geo-map/geo-map.ios.js";
import { GeoMap as GeoMapAndroid } from "../../../src/charts/geo-map/geo-map.android.js";
import { Video as VideoIOS } from "../../../src/atoms/video/video.ios.js";
import { Video as VideoAndroid } from "../../../src/atoms/video/video.android.js";

export const PLATFORM_SKINS: Record<"ios" | "android", Record<string, unknown>> = {
  ios: {
    Video: VideoIOS, Switch: SwitchIOS, Button: ButtonIOS, Checkbox: CheckboxIOS, Listbox: ListboxIOS, Radio: RadioIOS, RadioGroup: RadioGroupIOS,
    Input: InputIOS, Textarea: TextareaIOS, ButtonGroup: ButtonGroupIOS, Select: SelectIOS,
    Autocomplete: AutocompleteIOS, Dropdown: DropdownIOS, Popover: PopoverIOS, Tooltip: TooltipIOS,
    RowMenu: RowMenuIOS, Dialog: DialogIOS, AlertDialog: AlertDialogIOS,
    Spinner: SpinnerIOS, TabBar: TabBarIOS, Tabs: TabsIOS, Steps: StepsIOS,
    Navbar: NavbarIOS, Sidebar: SidebarIOS, Calendar: CalendarIOS,
    Avatar: AvatarIOS, AvatarGroup: AvatarGroupIOS, AvatarMenu: AvatarMenuIOS,
    Breadcrumb: BreadcrumbIOS, Slider: SliderIOS, Progress: ProgressIOS,
    Accordion: AccordionIOS, ActionSheet: ActionSheetIOS,
    ActionPanel: ActionPanelIOS, Card: CardIOS, CardMedia: CardMediaIOS, DescriptionList: DescriptionListIOS,
    EmptyState: EmptyStateIOS, Field: FieldIOS, Feed: FeedIOS, Form: FormIOS, FormSection: FormSectionIOS,
    GridList: GridListIOS, MediaObject: MediaObjectIOS, PhoneInput: PhoneInputIOS, StackedList: StackedListIOS, Stats: StatsIOS,
    Command: CommandIOS, DataTable: DataTableIOS, Drawer: DrawerIOS, FilterPanel: FilterPanelIOS,
    Stepper: StepperIOS, InputOTP: InputOTPIOS, Collapsible: CollapsibleIOS,
    Carousel: CarouselIOS,
    Board: BoardIOS, BreadcrumbItem: BreadcrumbItemIOS,
    DragDropProvider: DragDropProviderIOS, DropZone: DropZoneIOS, Draggable: DraggableIOS, DragHandle: DragHandleIOS,
    DashboardGrid: DashboardGridIOS, MetricBreakdown: MetricBreakdownIOS, GeoMap: GeoMapIOS,
  },
  android: {
    Video: VideoAndroid, Switch: SwitchAndroid, Button: ButtonAndroid, Checkbox: CheckboxAndroid, Listbox: ListboxAndroid, Radio: RadioAndroid, RadioGroup: RadioGroupAndroid,
    Input: InputAndroid, Textarea: TextareaAndroid, ButtonGroup: ButtonGroupAndroid, Select: SelectAndroid,
    Autocomplete: AutocompleteAndroid, Dropdown: DropdownAndroid, Popover: PopoverAndroid, Tooltip: TooltipAndroid,
    RowMenu: RowMenuAndroid, Dialog: DialogAndroid, AlertDialog: AlertDialogAndroid,
    Spinner: SpinnerAndroid, TabBar: TabBarAndroid, Tabs: TabsAndroid, Steps: StepsAndroid,
    Navbar: NavbarAndroid, Sidebar: SidebarAndroid, Calendar: CalendarAndroid,
    Avatar: AvatarAndroid, AvatarGroup: AvatarGroupAndroid, AvatarMenu: AvatarMenuAndroid,
    Breadcrumb: BreadcrumbAndroid, Slider: SliderAndroid, Progress: ProgressAndroid,
    Accordion: AccordionAndroid, ActionSheet: ActionSheetAndroid,
    ActionPanel: ActionPanelAndroid, Card: CardAndroid, CardMedia: CardMediaAndroid, DescriptionList: DescriptionListAndroid,
    EmptyState: EmptyStateAndroid, Field: FieldAndroid, Feed: FeedAndroid, Form: FormAndroid, FormSection: FormSectionAndroid,
    GridList: GridListAndroid, MediaObject: MediaObjectAndroid, PhoneInput: PhoneInputAndroid, StackedList: StackedListAndroid, Stats: StatsAndroid,
    Command: CommandAndroid, DataTable: DataTableAndroid, Drawer: DrawerAndroid, FilterPanel: FilterPanelAndroid,
    Stepper: StepperAndroid, InputOTP: InputOTPAndroid, Collapsible: CollapsibleAndroid,
    Carousel: CarouselAndroid, Toast: ToastAndroid, ToastProvider: ToastProviderAndroid, useToast: useToastAndroid,
    Chip: ChipAndroid,
    Board: BoardAndroid, BreadcrumbItem: BreadcrumbItemAndroid,
    DragDropProvider: DragDropProviderAndroid, DropZone: DropZoneAndroid, Draggable: DraggableAndroid, DragHandle: DragHandleAndroid,
    DashboardGrid: DashboardGridAndroid, MetricBreakdown: MetricBreakdownAndroid, GeoMap: GeoMapAndroid,
  },
};
