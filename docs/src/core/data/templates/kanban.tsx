import { Fragment, useRef, useState } from "react";
import {
  Row,
  Column,
  Card,
  Pressable,
  Typography,
  Button,
  Badge,
  Chip,
  Avatar,
  ScrollView,
  Icon,
  Stats,
  Progress,
  DescriptionList,
  EmptyState,
  Feed,
  RowMenu,
  Dialog,
  AlertDialog,
  Select,
  Input,
  Textarea,
  DragDropProvider,
  DropZone,
  Draggable,
  DragHandle,
  useFormFactor,
  useToast,
  type RowMenuItem,
  type ToastHandle,
} from "@nannier-com/canvas";
import type { FeedItem } from "@nannier-com/canvas";
import type { TemplateDoc } from "../types";

// A full working kanban board built entirely from live Canvas components. Every
// board capability is wired from the kit, no hand-rolled controls:
//   - cards DRAG between columns (and reorder within one), position-aware, via the
//     kit DragDrop capability: each column is a DropZone, each card a Draggable
//     with a DragHandle grip; the same move is also available from a per-card
//     RowMenu ("Move to …", the keyboard/screen-reader fallback) and from inside
//     the task-detail Dialog. Dragging is enabled only when the board is unfiltered
//     (so the visible cards are the whole column in order); the detail Dialog also
//     has an in-place Edit mode (title / detail / tag / priority / assignee / due)
//     and a comment thread;
//   - "Add task" and "Add column" open small create Dialogs; columns rename and
//     clear from a per-column header RowMenu (clear confirms via AlertDialog, and
//     is disabled on an empty column), and sort by priority or tag;
//   - a toolbar filters by tag (selectable Chips), assignee (Select), and title
//     (search Input), all ANDed; the Stats strip and per-column Badges stay live;
//   - the In progress column carries a WIP limit (Progress meter) that turns amber
//     at the limit and red (the Progress `warning`/`danger` tones) over it;
//     over-limit moves and adds still land but switch the toast to a warning;
//   - every move and delete toast carries an Undo that restores a whole-board
//     snapshot (never a re-insert, so undo can't duplicate a task), and a Feed
//     below the board logs the last few actions.
// One `Overlay` union drives every dialog surface, so at most one is ever open;
// delete-from-detail swaps the overlay rather than stacking dialogs. Columns and
// tasks carry stable IDS (names are editable), so all references are by id.
// `useFormFactor` is used in ONE place: the filter toolbar. The board pans and
// the dialogs cap their own width, but the bounded Select and search Input
// don't shrink, so at phone width the toolbar stacks (chips + Reset on one row,
// then the assignee Select and the search Input each full width) instead of
// overflowing off-screen.

const TAGS = ["security", "billing", "docs", "infra"] as const;
type Tag = (typeof TAGS)[number];
const PEOPLE = ["RC", "AL", "KT", "SM"];
const PRIORITIES = ["high", "medium", "low"] as const;
type Priority = (typeof PRIORITIES)[number];
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const WIP_LIMIT = 4;

// Ordered demo calendar; "today" sits between Jul 22 and Jul 24, so a due date
// before index TODAY_INDEX is overdue (unless the task is already Done).
const DATES = ["Jul 15", "Jul 16", "Jul 22", "Jul 24", "Jul 25", "Jul 26", "Jul 28", "Aug 1"];
const TODAY_INDEX = 3;
const DUE_OPTIONS = DATES.slice(2);

type Comment = { id: string; who: string; text: string };
type Task = {
  id: string;
  title: string;
  detail: string;
  tag: Tag;
  priority: Priority;
  who: string;
  due: string;
  comments: Comment[];
};
type BoardColumn = { id: string; name: string; tasks: Task[]; wipLimit?: number };

const SEED_COLUMNS: BoardColumn[] = [
  {
    id: "c-1",
    name: "To do",
    tasks: [
      { id: "t-1", title: "Rotate webhook secrets", detail: "Coordinate with integrations before the cutover.", tag: "security", priority: "high", who: "RC", due: "Jul 22", comments: [{ id: "m-1", who: "AL", text: "Blocked on the staging keys landing first." }] },
      { id: "t-2", title: "Draft Q3 access review", detail: "Pull the stale-grant report first.", tag: "docs", priority: "medium", who: "AL", due: "Jul 25", comments: [] },
      { id: "t-3", title: "Update billing FAQ", detail: "New yearly pricing needs a pass.", tag: "billing", priority: "low", who: "KT", due: "Jul 28", comments: [] },
    ],
  },
  {
    id: "c-2",
    name: "In progress",
    wipLimit: WIP_LIMIT,
    tasks: [
      { id: "t-4", title: "SSO rollout", detail: "Okta pilot group is live; SAML certs next.", tag: "security", priority: "high", who: "RC", due: "Jul 24", comments: [] },
      { id: "t-5", title: "Invoice PDF redesign", detail: "Header lockup approved, totals table left.", tag: "billing", priority: "medium", who: "SM", due: "Jul 26", comments: [] },
    ],
  },
  {
    id: "c-3",
    name: "Done",
    tasks: [
      { id: "t-6", title: "Enforce 2FA for admins", detail: "Grace period ended Monday.", tag: "security", priority: "high", who: "KT", due: "Jul 15", comments: [] },
      { id: "t-7", title: "Prune unused API keys", detail: "Revoked 14 keys idle for 90+ days.", tag: "infra", priority: "low", who: "AL", due: "Jul 16", comments: [] },
    ],
  },
];

const SEED_EVENTS: FeedItem[] = [
  { id: "e-0", actor: "You", action: "opened", target: "the board", time: "Just now" },
];

function isOverdue(task: Task, columnName: string): boolean {
  if (columnName === "Done") return false;
  const i = DATES.indexOf(task.due);
  return i >= 0 && i < TODAY_INDEX;
}

// One hue per tag, shared by the card chips and the filter chips so the whole
// board speaks one color vocabulary.
function TagChip({ tag, selectable, selected, onSelectedChange }: { tag: Tag; selectable?: boolean; selected?: boolean; onSelectedChange?: (next: boolean) => void }) {
  const hues = { red: tag === "security", amber: tag === "billing", blue: tag === "docs", violet: tag === "infra" };
  if (selectable) {
    return (
      <Chip {...hues} outline selectable selected={selected} onSelectedChange={onSelectedChange}>
        {tag}
      </Chip>
    );
  }
  return <Chip {...hues}>{tag}</Chip>;
}

function findTask(columns: BoardColumn[], id: string): { task: Task; columnIndex: number } | null {
  for (let c = 0; c < columns.length; c++) {
    const task = columns[c]?.tasks.find((t) => t.id === id);
    if (task) return { task, columnIndex: c };
  }
  return null;
}

type Overlay =
  | { kind: "detail"; taskId: string }
  | { kind: "add"; columnId: string }
  | { kind: "confirmDelete"; taskId: string; fromDetail: boolean }
  | { kind: "addColumn" }
  | { kind: "renameColumn"; columnId: string }
  | { kind: "confirmClear"; columnId: string }
  | null;

// The card open-affordance and the RowMenu trigger are SIBLINGS, never nested:
// the title and the detail/meta block are their own Pressables that open the
// detail dialog, and the ⋯ menu sits beside the title. Wrapping the whole card in
// Card's onPress would nest the menu button inside the card button (invalid, and
// a press-target conflict), so the card itself is a plain container. When
// `draggable`, a DragHandle grip leads the title row: it is the drag activator
// (the whole card is wrapped in a Draggable by the column), and it is also the
// keyboard/screen-reader drag control. Dragging is the PRIMARY move affordance;
// the RowMenu "Move to" items remain the accessible fallback.
function TaskCard({ task, columnName, menuItems, onOpen, onMenuSelect, draggable }: { task: Task; columnName: string; menuItems: RowMenuItem[]; onOpen: () => void; onMenuSelect: (item: RowMenuItem, index: number) => void; draggable?: boolean }) {
  const overdue = isOverdue(task, columnName);
  return (
    <Card compact>
      <Column tight>
        <Row between alignCenter>
          <Row snug alignCenter style={{ flexShrink: 1 }}>
            {draggable ? <DragHandle label={`Reorder ${task.title}`} /> : null}
            <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${task.title}`} style={{ flexShrink: 1 }}>
              <Typography small medium>{task.title}</Typography>
            </Pressable>
          </Row>
          <RowMenu items={menuItems} onSelect={onMenuSelect} triggerLabel={`Actions for ${task.title}`} />
        </Row>
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${task.title} details`}>
          <Column tight>
            <Typography tiny>{task.detail}</Typography>
            <Row between alignCenter>
              <Row snug alignCenter wrap>
                <TagChip tag={task.tag} />
                {task.priority === "high" ? <Badge status warning>high</Badge> : null}
                {overdue ? <Badge status error>{`Due ${task.due}`}</Badge> : null}
              </Row>
              <Row snug alignCenter>
                {task.comments.length > 0 ? (
                  <Row snug alignCenter>
                    <Icon messageCircle size={14} muted aria-hidden />
                    <Typography tiny>{String(task.comments.length)}</Typography>
                  </Row>
                ) : null}
                <Avatar small name={task.who} />
              </Row>
            </Row>
          </Column>
        </Pressable>
      </Column>
    </Card>
  );
}

function TaskDetailDialog({ columns, taskId, onMove, onEdit, onComment, onDeleteRequest, onClose }: {
  columns: BoardColumn[];
  taskId: string;
  onMove: (taskId: string, targetId: string) => void;
  onEdit: (taskId: string, patch: Partial<Task>) => void;
  onComment: (taskId: string, text: string) => void;
  onDeleteRequest: () => void;
  onClose: () => void;
}) {
  const found = findTask(columns, taskId);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDetail, setDraftDetail] = useState("");
  const [draftTag, setDraftTag] = useState<Tag>("security");
  const [draftPriority, setDraftPriority] = useState<Priority>("medium");
  const [draftWho, setDraftWho] = useState(PEOPLE[0] ?? "RC");
  const [draftDue, setDraftDue] = useState(DUE_OPTIONS[0] ?? "Jul 24");
  const [comment, setComment] = useState("");

  if (!found) return null;
  const { task, columnIndex } = found;
  const columnName = columns[columnIndex]?.name ?? "";
  const others = columns.filter((c) => c.id !== columns[columnIndex]?.id);

  const startEdit = () => {
    setDraftTitle(task.title);
    setDraftDetail(task.detail);
    setDraftTag(task.tag);
    setDraftPriority(task.priority);
    setDraftWho(task.who);
    setDraftDue(task.due);
    setEditing(true);
  };
  const saveEdit = () => {
    onEdit(task.id, { title: draftTitle.trim() || task.title, detail: draftDetail.trim(), tag: draftTag, priority: draftPriority, who: draftWho, due: draftDue });
    setEditing(false);
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }} large>
      <Column relaxed>
        {editing ? (
          <Column relaxed>
            <Typography lead semibold>Edit task</Typography>
            <Input label="Title" required value={draftTitle} onChangeText={setDraftTitle} />
            <Textarea label="Detail" value={draftDetail} onChangeText={setDraftDetail} />
            <Row relaxed wrap>
              <Select label="Tag" options={[...TAGS]} value={draftTag} onSelect={(o) => setDraftTag(o as Tag)} />
              <Select label="Priority" options={[...PRIORITIES]} value={draftPriority} onSelect={(o) => setDraftPriority(o as Priority)} />
            </Row>
            <Row relaxed wrap>
              <Select label="Assignee" options={PEOPLE} value={draftWho} onSelect={setDraftWho} />
              <Select label="Due" options={DUE_OPTIONS} value={draftDue} onSelect={setDraftDue} />
            </Row>
            <Row end snug alignCenter>
              <Button outline small onPress={() => setEditing(false)}>Cancel</Button>
              <Button primary small disabled={!draftTitle.trim()} onPress={saveEdit}>Save</Button>
            </Row>
          </Column>
        ) : (
          <Column relaxed>
            <Row between alignCenter wrap>
              <Column tight style={{ flexShrink: 1 }}>
                <Typography lead semibold>{task.title}</Typography>
                <Typography small muted>{task.detail || "No description."}</Typography>
              </Column>
              <Button outline small iconLeft={<Icon pencil size={16} />} onPress={startEdit}>Edit</Button>
            </Row>
            <DescriptionList
              twoColumn
              items={[
                { term: "Status", value: columnName, badge: true },
                { term: "Tag", value: task.tag, badge: true },
                { term: "Priority", value: task.priority, badge: true },
                { term: "Assignee", value: task.who, avatars: [{ name: task.who }] },
                { term: "Due", value: isOverdue(task, columnName) ? `${task.due} (overdue)` : task.due },
                { term: "Task ID", value: task.id, mono: true },
              ]}
            />
            <Column tight>
              <Typography small semibold>{`Comments (${task.comments.length})`}</Typography>
              {task.comments.length === 0 ? (
                <Typography tiny>No comments yet.</Typography>
              ) : (
                task.comments.map((c) => (
                  <Row key={c.id} snug alignStart>
                    <Avatar small name={c.who} />
                    <Typography small style={{ flexShrink: 1 }}>{c.text}</Typography>
                  </Row>
                ))
              )}
              <Row snug alignCenter>
                <Column fill>
                  <Input placeholder="Add a comment…" value={comment} onChangeText={setComment} onSubmitEditing={() => { if (comment.trim()) { onComment(task.id, comment.trim()); setComment(""); } }} />
                </Column>
                <Button outline small disabled={!comment.trim()} onPress={() => { onComment(task.id, comment.trim()); setComment(""); }}>Post</Button>
              </Row>
            </Column>
            <Row between wrap alignCenter>
              <Button destructive small onPress={onDeleteRequest}>Delete…</Button>
              <Row snug wrap alignCenter>
                {others.map((o) => (
                  <Button key={o.id} outline small onPress={() => onMove(task.id, o.id)}>{`Move to ${o.name}`}</Button>
                ))}
                <Button primary small onPress={onClose}>Close</Button>
              </Row>
            </Row>
          </Column>
        )}
      </Column>
    </Dialog>
  );
}

// Draft state lives here, so mounting the dialog fresh resets the form for free.
function AddTaskDialog({ columnName, onCreate, onClose }: { columnName: string; onCreate: (draft: { title: string; tag: Tag; priority: Priority; who: string; due: string }) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState<Tag>("security");
  const [priority, setPriority] = useState<Priority>("medium");
  const [who, setWho] = useState(PEOPLE[0] ?? "RC");
  const [due, setDue] = useState(DUE_OPTIONS[0] ?? "Jul 24");
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }} small>
      <Column relaxed>
        <Typography lead semibold>{`Add task to ${columnName}`}</Typography>
        <Input label="Title" required value={title} onChangeText={setTitle} placeholder="What needs doing?" />
        <Row relaxed wrap>
          <Select label="Tag" options={[...TAGS]} value={tag} onSelect={(o) => setTag(o as Tag)} />
          <Select label="Priority" options={[...PRIORITIES]} value={priority} onSelect={(o) => setPriority(o as Priority)} />
        </Row>
        <Row relaxed wrap>
          <Select label="Assignee" options={PEOPLE} value={who} onSelect={setWho} />
          <Select label="Due" options={DUE_OPTIONS} value={due} onSelect={setDue} />
        </Row>
        <Row end snug alignCenter>
          <Button outline small onPress={onClose}>Cancel</Button>
          <Button primary small disabled={!title.trim()} onPress={() => onCreate({ title: title.trim(), tag, priority, who, due })}>Add task</Button>
        </Row>
      </Column>
    </Dialog>
  );
}

function ColumnNameDialog({ title, initial, confirmLabel, onSubmit, onClose }: { title: string; initial: string; confirmLabel: string; onSubmit: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }} small>
      <Column relaxed>
        <Typography lead semibold>{title}</Typography>
        <Input label="Column name" required value={name} onChangeText={setName} placeholder="e.g. In review" />
        <Row end snug alignCenter>
          <Button outline small onPress={onClose}>Cancel</Button>
          <Button primary small disabled={!name.trim()} onPress={() => onSubmit(name.trim())}>{confirmLabel}</Button>
        </Row>
      </Column>
    </Dialog>
  );
}

function BoardColumnView({ column, columns, tagFilter, assigneeFilter, query, dndEnabled, onClearFilters, onOpen, onMove, onDeleteRequest, onAddRequest, onColumnMenu }: {
  column: BoardColumn;
  columns: BoardColumn[];
  tagFilter: Tag | null;
  assigneeFilter: string | null;
  query: string;
  // Drag is enabled only when the board is unfiltered, so the rendered cards match the full
  // column order and a drop index maps straight onto column.tasks.
  dndEnabled: boolean;
  onClearFilters: () => void;
  onOpen: (taskId: string) => void;
  onMove: (taskId: string, targetId: string, index?: number) => void;
  onDeleteRequest: (taskId: string) => void;
  onAddRequest: (columnId: string) => void;
  onColumnMenu: (columnId: string, index: number) => void;
}) {
  const q = query.trim().toLowerCase();
  const visible = column.tasks.filter(
    (t) => (!tagFilter || t.tag === tagFilter) && (!assigneeFilter || t.who === assigneeFilter) && (!q || t.title.toLowerCase().includes(q)),
  );
  const otherColumns = columns.filter((c) => c.id !== column.id);
  const cardMenu: RowMenuItem[] = [
    ...otherColumns.map((c) => ({ label: `Move to ${c.name}`, icon: "arrowRight" as const })),
    { label: "Delete", icon: "trash" as const, destructive: true, separatorBefore: true },
  ];
  // "Clear column" is disabled (not omitted) on an already-empty column, so the affordance
  // stays visible but inert instead of short-circuiting to a toast.
  const columnMenu: RowMenuItem[] = [
    { label: "Sort by priority", icon: "listOrdered" },
    { label: "Sort by tag", icon: "filter" },
    { label: "Rename column", icon: "pencil", separatorBefore: true },
    { label: "Clear column", icon: "trash", destructive: true, disabled: column.tasks.length === 0 },
  ];
  const filtersActive = !!tagFilter || !!assigneeFilter || !!q;
  const over = !!column.wipLimit && column.tasks.length > column.wipLimit;
  const atLimit = !!column.wipLimit && column.tasks.length === column.wipLimit;
  return (
    <Column snug style={{ width: 260 }}>
      <Row between alignCenter>
        <Row snug alignCenter style={{ flexShrink: 1 }}>
          <Typography small semibold style={{ flexShrink: 1 }}>{column.name}</Typography>
          <Badge secondary>{visible.length}</Badge>
        </Row>
        <RowMenu items={columnMenu} onSelect={(_item, index) => onColumnMenu(column.id, index)} triggerLabel={`Actions for ${column.name}`} />
      </Row>
      {column.wipLimit ? (
        <Column tight>
          <Progress small warning={atLimit} danger={over} value={Math.min(column.tasks.length / column.wipLimit, 1)} accessibilityLabel="Work-in-progress limit" />
          <Typography tiny>{`${column.tasks.length} of ${column.wipLimit} WIP`}</Typography>
        </Column>
      ) : null}
      <DropZone id={column.id} label={column.name} disabled={!dndEnabled} onDrop={(e) => onMove(e.id, e.to, e.index)} style={{ minHeight: 24 }}>
        <Column snug>
          {visible.map((task) => {
            const card = (
              <TaskCard
                task={task}
                columnName={column.name}
                menuItems={cardMenu}
                draggable={dndEnabled}
                onOpen={() => onOpen(task.id)}
                onMenuSelect={(_item, index) => {
                  const target = otherColumns[index];
                  if (target) onMove(task.id, target.id);
                  else onDeleteRequest(task.id);
                }}
              />
            );
            return dndEnabled ? (
              <Draggable key={task.id} id={task.id} data={task} label={task.title}>
                {card}
              </Draggable>
            ) : (
              <Fragment key={task.id}>{card}</Fragment>
            );
          })}
          {visible.length === 0 ? (
            column.tasks.length > 0 && filtersActive ? (
              <EmptyState bordered compact icon={<Icon search />} title="No matching tasks" description="No cards here match the filters." actionLabel="Clear filters" onAction={onClearFilters} />
            ) : (
              <EmptyState bordered compact icon={<Icon inbox />} title="No tasks" description="Add one or move a card here." />
            )
          ) : null}
        </Column>
      </DropZone>
      <Button ghost small iconLeft={<Icon plus size={16} />} onPress={() => onAddRequest(column.id)}>Add task</Button>
    </Column>
  );
}

// The whole board shares one state: columns, three filters, an activity log, and
// one overlay union that guarantees at most one dialog surface is open at a time.
function BoardLive() {
  const { toast } = useToast() as ToastHandle;
  // Phone restructures the toolbar (Select/Input leave the chips row and go
  // full-width `block`), not just a row-to-column flip, so this stays a
  // hook-driven branch rather than a Row `stacks`.
  const stackToolbar = useFormFactor() === "phone";
  const [columns, setColumns] = useState<BoardColumn[]>(SEED_COLUMNS);
  const [tagFilter, setTagFilter] = useState<Tag | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<FeedItem[]>(SEED_EVENTS);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const taskId = useRef(8);
  const columnId = useRef(4);
  const commentId = useRef(2);
  const eventId = useRef(1);

  const log = (action: string, target?: string) =>
    setEvents((prev) => [{ id: `e-${eventId.current++}`, actor: "You", action, target, time: "Just now" }, ...prev].slice(0, 8));

  // Undo restores the whole pre-mutation board (columns are immutable, so a
  // snapshot is just the old reference). The id counters are intentionally not
  // restored, keeping ids unique across an undo.
  const undoAction = (snapshot: BoardColumn[]) => ({
    label: "Undo",
    onPress: () => {
      setColumns(snapshot);
      log("undid", "the last change");
    },
  });

  const clearFilters = () => {
    setTagFilter(null);
    setAssigneeFilter(null);
    setQuery("");
  };

  // Move a task to a column, optionally at a specific insertion index (drag-and-drop passes
  // the drop position; the "Move to" menu omits it and appends). When the source and target
  // are the same column an index reorders the card in place. The whole-board snapshot still
  // powers a single Undo.
  const moveTask = (id: string, targetId: string, index?: number) => {
    const found = findTask(columns, id);
    const targetIndex = columns.findIndex((c) => c.id === targetId);
    const targetColumn = columns[targetIndex];
    if (!found || !targetColumn) return;
    const sourceId = columns[found.columnIndex]?.id;
    const sameColumn = sourceId === targetId;
    // A same-column drop onto the card's own position is a no-op (nothing to undo/announce).
    if (sameColumn && index != null) {
      const current = found.task ? targetColumn.tasks.findIndex((t) => t.id === id) : -1;
      if (current === index || current === index - 1) return;
    }
    const snapshot = columns;
    const insertAt = (tasks: Task[]) => {
      const at = index == null ? tasks.length : Math.max(0, Math.min(index, tasks.length));
      return [...tasks.slice(0, at), found.task, ...tasks.slice(at)];
    };
    const next = columns.map((c) => {
      if (sameColumn && c.id === targetId) return { ...c, tasks: insertAt(c.tasks.filter((t) => t.id !== id)) };
      if (c.id === sourceId) return { ...c, tasks: c.tasks.filter((t) => t.id !== id) };
      if (c.id === targetId) return { ...c, tasks: insertAt(c.tasks) };
      return c;
    });
    setColumns(next);
    const newCount = (next[targetIndex]?.tasks ?? []).length;
    if (sameColumn) {
      log("reordered", `"${found.task.title}" in ${targetColumn.name}`);
      toast({ message: `Reordered ${targetColumn.name}`, description: `"${found.task.title}" moved position.`, action: undoAction(snapshot) });
      return;
    }
    log("moved", `"${found.task.title}" to ${targetColumn.name}`);
    if (targetColumn.wipLimit && newCount > targetColumn.wipLimit) {
      toast({ warning: true, message: "WIP limit exceeded", description: `${targetColumn.name} now holds ${newCount} of ${targetColumn.wipLimit}.`, action: undoAction(snapshot) });
    } else {
      toast({ message: `Moved to ${targetColumn.name}`, description: `"${found.task.title}" changed status.`, action: undoAction(snapshot) });
    }
  };


  const deleteTask = (id: string) => {
    const found = findTask(columns, id);
    if (!found) return;
    const snapshot = columns;
    setColumns(columns.map((c, i) => (i === found.columnIndex ? { ...c, tasks: c.tasks.filter((t) => t.id !== id) } : c)));
    setOverlay(null);
    log("deleted", `"${found.task.title}"`);
    toast({ message: "Task deleted", description: `"${found.task.title}" was removed.`, action: undoAction(snapshot) });
  };

  const addTask = (colId: string, draft: { title: string; tag: Tag; priority: Priority; who: string; due: string }) => {
    const targetIndex = columns.findIndex((c) => c.id === colId);
    const targetColumn = columns[targetIndex];
    if (!targetColumn) return;
    const task: Task = { id: `t-${taskId.current++}`, title: draft.title, detail: "Added from the board.", tag: draft.tag, priority: draft.priority, who: draft.who, due: draft.due, comments: [] };
    const next = columns.map((c) => (c.id === colId ? { ...c, tasks: [...c.tasks, task] } : c));
    setColumns(next);
    setOverlay(null);
    // Clear any filter that would hide the new card, so it lands visibly.
    if ((tagFilter && draft.tag !== tagFilter) || (assigneeFilter && draft.who !== assigneeFilter) || (query.trim() && !draft.title.toLowerCase().includes(query.trim().toLowerCase()))) {
      clearFilters();
    }
    log("added", `"${task.title}" to ${targetColumn.name}`);
    const newCount = (next[targetIndex]?.tasks ?? []).length;
    if (targetColumn.wipLimit && newCount > targetColumn.wipLimit) {
      toast({ warning: true, message: "WIP limit exceeded", description: `${targetColumn.name} now holds ${newCount} of ${targetColumn.wipLimit}.` });
    } else {
      toast({ success: true, message: "Task added", description: `"${task.title}" is in ${targetColumn.name}.` });
    }
  };

  const editTask = (id: string, patch: Partial<Task>) => {
    setColumns(columns.map((c) => ({ ...c, tasks: c.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })));
    log("edited", patch.title ? `"${patch.title}"` : "a task");
    toast({ message: "Task updated", description: "Your changes were saved." });
  };

  const addComment = (id: string, text: string) => {
    setColumns(columns.map((c) => ({ ...c, tasks: c.tasks.map((t) => (t.id === id ? { ...t, comments: [...t.comments, { id: `m-${commentId.current++}`, who: "You", text }] } : t)) })));
    log("commented", "on a task");
  };

  const sortColumn = (colId: string, by: "priority" | "tag") => {
    setColumns(columns.map((c) => {
      if (c.id !== colId) return c;
      const tasks = [...c.tasks].sort((a, b) => (by === "priority" ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] : a.tag.localeCompare(b.tag)));
      return { ...c, tasks };
    }));
    const name = columns.find((c) => c.id === colId)?.name ?? "column";
    log("sorted", `${name} by ${by}`);
    toast({ message: `Sorted by ${by}`, description: `${name} reordered.` });
  };

  const addColumn = (name: string) => {
    setColumns([...columns, { id: `c-${columnId.current++}`, name, tasks: [] }]);
    setOverlay(null);
    log("added", `column "${name}"`);
    toast({ success: true, message: "Column added", description: `"${name}" is on the board.` });
  };

  const renameColumn = (colId: string, name: string) => {
    setColumns(columns.map((c) => (c.id === colId ? { ...c, name } : c)));
    setOverlay(null);
    log("renamed", `a column to "${name}"`);
    toast({ message: "Column renamed", description: `Now "${name}".` });
  };

  const clearColumn = (colId: string) => {
    const col = columns.find((c) => c.id === colId);
    if (!col) return;
    const snapshot = columns;
    setColumns(columns.map((c) => (c.id === colId ? { ...c, tasks: [] } : c)));
    setOverlay(null);
    log("cleared", col.name);
    toast({ message: "Column cleared", description: `${col.name} is now empty.`, action: undoAction(snapshot) });
  };

  // "Clear column" is disabled on an empty column (a RowMenuItem `disabled`), so this only
  // ever runs with cards present; it opens the confirm dialog directly.
  const onColumnMenu = (colId: string, index: number) => {
    if (index === 0) sortColumn(colId, "priority");
    else if (index === 1) sortColumn(colId, "tag");
    else if (index === 2) setOverlay({ kind: "renameColumn", columnId: colId });
    else setOverlay({ kind: "confirmClear", columnId: colId });
  };

  const resetBoard = () => {
    setColumns(SEED_COLUMNS);
    clearFilters();
    setOverlay(null);
    taskId.current = 8;
    columnId.current = 4;
    commentId.current = 2;
    eventId.current = 1;
    setEvents([{ id: "e-0", actor: "You", action: "reset the board", time: "Just now" }]);
    toast({ message: "Board reset", description: "Back to the seed tasks." });
  };

  const requestDelete = (id: string, fromDetail: boolean) => setOverlay({ kind: "confirmDelete", taskId: id, fromDetail });

  // Drag is the primary move affordance, but only when the board is unfiltered: then the
  // rendered cards are the whole column in order, so a drop index maps straight onto
  // column.tasks. Under an active filter the cards are a subset and dragging is disabled,
  // leaving the RowMenu "Move to" items (the accessible fallback) as the move path.
  const dndEnabled = !(tagFilter || assigneeFilter || query.trim());

  const total = columns.reduce((n, c) => n + c.tasks.length, 0);
  const wipColumn = columns.find((c) => c.wipLimit);
  const wip = wipColumn?.tasks.length ?? 0;
  const doneColumn = columns.find((c) => c.name === "Done");
  const done = doneColumn?.tasks.length ?? 0;
  const donePct = total ? Math.round((done / total) * 100) : 0;

  const confirmTask = overlay?.kind === "confirmDelete" ? findTask(columns, overlay.taskId) : null;
  const clearColumnName = overlay?.kind === "confirmClear" ? columns.find((c) => c.id === overlay.columnId)?.name ?? "" : "";
  const addColumnName = overlay?.kind === "add" ? columns.find((c) => c.id === overlay.columnId)?.name ?? "" : "";
  const renameInitial = overlay?.kind === "renameColumn" ? columns.find((c) => c.id === overlay.columnId)?.name ?? "" : "";

  return (
    <Column relaxed>
      <Stats
        plain
        items={[
          { label: "Tasks", value: String(total) },
          { label: "In progress", value: `${wip}/${WIP_LIMIT}` },
          { label: "Done", value: `${donePct}%` },
        ]}
      />
      {stackToolbar ? (
        <Column relaxed>
          <Row between wrap alignCenter>
            <Row snug wrap alignCenter>
              {TAGS.map((tag) => (
                <TagChip key={tag} tag={tag} selectable selected={tagFilter === tag} onSelectedChange={(next) => setTagFilter(next ? tag : null)} />
              ))}
            </Row>
            <Button ghost small iconLeft={<Icon rotateCcw size={16} />} onPress={resetBoard}>Reset board</Button>
          </Row>
          <Select label="Assignee" options={["Anyone", ...PEOPLE]} value={assigneeFilter ?? "Anyone"} onSelect={(o) => setAssigneeFilter(o === "Anyone" ? null : o)} />
          <Input leadingIcon icon="search" placeholder="Search tasks…" value={query} onChangeText={setQuery} />
        </Column>
      ) : (
        <Row between wrap alignCenter>
          <Row snug wrap alignCenter>
            {TAGS.map((tag) => (
              <TagChip key={tag} tag={tag} selectable selected={tagFilter === tag} onSelectedChange={(next) => setTagFilter(next ? tag : null)} />
            ))}
            <Select inline label="Assignee" options={["Anyone", ...PEOPLE]} value={assigneeFilter ?? "Anyone"} onSelect={(o) => setAssigneeFilter(o === "Anyone" ? null : o)} />
            <Input small leadingIcon icon="search" placeholder="Search tasks…" value={query} onChangeText={setQuery} />
          </Row>
          <Button ghost small iconLeft={<Icon rotateCcw size={16} />} onPress={resetBoard}>Reset board</Button>
        </Row>
      )}

      {/* The overlay slot: dialogs are contained inline backdrops, so they live
          here, outside the panning ScrollView and near the top of the section. */}
      {overlay?.kind === "detail" ? (
        <TaskDetailDialog
          columns={columns}
          taskId={overlay.taskId}
          onMove={moveTask}
          onEdit={editTask}
          onComment={addComment}
          onDeleteRequest={() => requestDelete(overlay.taskId, true)}
          onClose={() => setOverlay(null)}
        />
      ) : null}
      {overlay?.kind === "add" ? (
        <AddTaskDialog columnName={addColumnName} onCreate={(draft) => addTask(overlay.columnId, draft)} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay?.kind === "addColumn" ? (
        <ColumnNameDialog title="Add column" initial="" confirmLabel="Add column" onSubmit={addColumn} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay?.kind === "renameColumn" ? (
        <ColumnNameDialog title="Rename column" initial={renameInitial} confirmLabel="Rename" onSubmit={(name) => renameColumn(overlay.columnId, name)} onClose={() => setOverlay(null)} />
      ) : null}
      {overlay?.kind === "confirmDelete" && confirmTask ? (
        <AlertDialog
          open
          onOpenChange={(next) => { if (!next) setOverlay(overlay.fromDetail ? { kind: "detail", taskId: overlay.taskId } : null); }}
          destructive
          small
          title="Delete this task?"
          description={`"${confirmTask.task.title}" will be removed from ${columns[confirmTask.columnIndex]?.name ?? "the board"}. You can undo from the toast.`}
          cancelLabel="Cancel"
          confirmLabel="Delete"
          onConfirm={() => deleteTask(overlay.taskId)}
        />
      ) : null}
      {overlay?.kind === "confirmClear" ? (
        <AlertDialog
          open
          onOpenChange={(next) => { if (!next) setOverlay(null); }}
          destructive
          small
          title={`Clear ${clearColumnName}?`}
          description={`Every card in ${clearColumnName} will be removed. You can undo from the toast.`}
          cancelLabel="Cancel"
          confirmLabel="Clear column"
          onConfirm={() => clearColumn(overlay.columnId)}
        />
      ) : null}

      {/* The board is one DragDropProvider: it hosts the floating drag ghost above the
          panning ScrollView (so the ghost is never clipped) and coordinates the columns as
          drop zones. */}
      <DragDropProvider>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row relaxed alignStart>
            {columns.map((column) => (
              <BoardColumnView
                key={column.id}
                column={column}
                columns={columns}
                tagFilter={tagFilter}
                assigneeFilter={assigneeFilter}
                query={query}
                dndEnabled={dndEnabled}
                onClearFilters={clearFilters}
                onOpen={(id) => setOverlay({ kind: "detail", taskId: id })}
                onMove={moveTask}
                onDeleteRequest={(id) => requestDelete(id, false)}
                onAddRequest={(colId) => setOverlay({ kind: "add", columnId: colId })}
                onColumnMenu={onColumnMenu}
              />
            ))}
            <Column snug style={{ width: 260 }}>
              <Button outline block iconLeft={<Icon plus size={16} />} onPress={() => setOverlay({ kind: "addColumn" })}>Add column</Button>
            </Column>
          </Row>
        </ScrollView>
      </DragDropProvider>

      <Column tight>
        <Typography small semibold>Recent activity</Typography>
        <Feed connector compact items={events} />
      </Column>
    </Column>
  );
}

export const KANBAN_TEMPLATE: TemplateDoc = {
  slug: "kanban",
  name: "Kanban",
  description:
    "A working status board: drag task cards between columns (or reorder within one), with a per-card menu and detail dialog as accessible fallbacks, plus editing, comments, priorities, tag and assignee filters, WIP limits with warning/danger meters, undo, and an activity log. Built from live Canvas components.",
  sections: [
    {
      title: "Board",
      anatomy:
        "A Stats strip (live totals) over a filter toolbar (selectable tag Chips, an assignee Select, a search Input, Reset). Below, one DragDropProvider wraps a horizontal ScrollView of fixed-width columns: each column is a DropZone headed by its visible-count Badge and a RowMenu (sort, rename, clear, the last disabled when empty), the WIP column adds a Progress meter that goes amber at the limit and red over it, and cards are Draggables with a DragHandle grip plus their own action menu. Dragging a card lifts a floating ghost and drops it at a position within or across columns; the grip is keyboard- and screen-reader-operable, and the RowMenu 'Move to' items are the always-on fallback (drag is disabled while a filter is active). Pressing a card opens a detail Dialog (DescriptionList rows, a comment thread, an Edit mode, move and delete actions); Add task and Add column open small Dialogs; deletes and clears confirm through an AlertDialog; moves, reorders, and deletes offer Undo from a toast. A Feed logs recent activity. On phones the board pans instead of squeezing.",
      render: () => <BoardLive />,
    },
  ],
};
