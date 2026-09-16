# Board

A data-driven kanban board: columns scroll horizontally, each column is a drop zone, and every card carries a drag grip, an optional trailing badge, a muted two-line description, a free-form chips slot, and an optional kebab menu. Dragging is the kit's own drag-and-drop family, so it runs on iOS, Android, and the web from one code path and stays keyboard- and screen-reader-operable: press Space on a grip to grab, the arrow keys to move between positions and columns, Space to drop, Escape to cancel. The list stays controlled: a drop reports a `BoardMove` (source, target, insertion index, and the new neighbor ids) through `onMove`, and `applyBoardMove` is the standard reducer to apply it. Pass `defaultItems` instead of `items` for uncontrolled use, where the board applies each move itself.

## Usage

```tsx
<Board
  columns={[
    { id: "todo", label: "To do" },
    { id: "doing", label: "Doing" },
    { id: "done", label: "Done" },
  ]}
  defaultItems={[
    { id: "t1", columnId: "todo", title: "Rotate webhook secrets" },
    { id: "t2", columnId: "todo", title: "Draft the design review" },
    { id: "t3", columnId: "doing", title: "SSO rollout" },
    { id: "t4", columnId: "done", title: "Upgrade the CI runners" },
  ]}
/>
```

## Variants

### Compact

The density axis tightens the lane padding, the card gaps, and the card insets for a board that has to show more at once.

```tsx
<Board
  compact
  columns={[
    { id: "todo", label: "To do" },
    { id: "doing", label: "Doing" },
  ]}
  defaultItems={[
    { id: "t1", columnId: "todo", title: "Rotate webhook secrets" },
    { id: "t2", columnId: "todo", title: "Draft the design review" },
    { id: "t3", columnId: "doing", title: "SSO rollout" },
  ]}
/>
```

### Card menus and press

`onPressItem` makes each card's body pressable (the grip and the kebab stay separate controls), and a card with `menu` rows gains a kebab reported through `onSelectItemMenu`. `chips` is a free slot under the title for chips or avatars.

```tsx
<Board
  columns={[
    { id: "todo", label: "To do" },
    { id: "doing", label: "Doing" },
  ]}
  defaultItems={[
    { id: "t1", columnId: "todo", title: "Rotate webhook secrets", menu: [{ label: "Edit", icon: "pencil" }, { label: "Delete", icon: "trash", destructive: true }] },
    { id: "t2", columnId: "doing", title: "SSO rollout", chips: <Chip>identity</Chip> },
  ]}
  onPressItem={(item) => {}}
  onSelectItemMenu={(item, menuItem) => {}}
/>
```

### Empty column and explicit badges

An empty column shows the muted `emptyLabel` and stays a valid drop target. A column's `badge` prop replaces the automatic item count (a WIP limit, a status).

```tsx
<Board
  columns={[
    { id: "todo", label: "To do", badge: "WIP 2" },
    { id: "doing", label: "Doing" },
  ]}
  defaultItems={[
    { id: "t1", columnId: "todo", title: "Rotate webhook secrets" },
    { id: "t2", columnId: "todo", title: "Draft the design review" },
  ]}
  emptyLabel="Drop tasks here"
/>
```

### Controlled

`items` keeps the list in your hands: each drop reports a `BoardMove` through `onMove`, and `applyBoardMove` is the standard reducer to apply it.

```tsx
<Stateful initial={[
  { id: "t1", columnId: "todo", title: "Rotate webhook secrets" },
  { id: "t2", columnId: "doing", title: "SSO rollout" },
]}>
  {(items, setItems) => (
    <Board
      columns={[
        { id: "todo", label: "To do" },
        { id: "doing", label: "Doing" },
      ]}
      items={items}
      onMove={(move) => setItems(applyBoardMove(items, move))}
    />
  )}
</Stateful>
```

## Do & Don't

### Moves stay in the consumer's data

**Do** — Treat `items` as the single source of truth: apply every `onMove` to your own array (`applyBoardMove`), and persist `afterId`/`beforeId` if your backend ranks by neighbors.

```tsx
<Stateful initial={[
  { id: "t1", columnId: "todo", title: "Rotate webhook secrets" },
  { id: "t2", columnId: "doing", title: "SSO rollout" },
]}>
  {(items, setItems) => (
    <Board
      columns={[
        { id: "todo", label: "To do" },
        { id: "doing", label: "Doing" },
      ]}
      items={items}
      onMove={(move) => setItems(applyBoardMove(items, move))}
    />
  )}
</Stateful>
```

**Don't** — Don't pass a controlled `items` and drop the move on the floor: the drag completes, announces, and then the card snaps back because nothing updated the array.

```tsx
<Board
  columns={[
    { id: "todo", label: "To do" },
    { id: "doing", label: "Doing" },
  ]}
  items={[
    { id: "t1", columnId: "todo", title: "Rotate webhook secrets" },
    { id: "t2", columnId: "doing", title: "SSO rollout" },
  ]}
/>
```
