# FilterPanel

Sidebar filter rail of grouped checkbox options with counts. Add `responsive`
and at and below `drawerBreakpoint` (default `sm` = 640) the docked panel
collapses to a "Filters (n)" outline button that opens the same panel inside a
start-edge drawer, so a phone keeps its width for the results; `open` /
`defaultOpen` / `onOpenChange` drive the drawer for controlled use.

## Usage

```tsx
<FilterPanel
  groups={[
    { title: "Status", options: [
      { label: "Active", checked: true, count: "128" },
      { label: "Pending", count: "12" },
      { label: "Archived", count: "2" }
    ] },
    { title: "Schema", options: [
      { label: "Default", count: "96" },
      { label: "Custom", count: "46" }
    ] }
  ]}
/>
```

## Variants

### Responsive drawer

At desktop widths this renders the docked panel unchanged; at and below the
`sm` breakpoint it renders the "Filters (n)" trigger and the panel opens in a
drawer.

```tsx
<FilterPanel
  responsive
  groups={[
    { title: "Status", options: [
      { label: "Active", checked: true },
      { label: "Archived" }
    ] },
    { title: "Schema", options: [
      { label: "Default" },
      { label: "Custom" }
    ] }
  ]}
/>
```
