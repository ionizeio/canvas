# EmptyState

Centered, calm, never blame the user. Always tell them what could be here, and ideally how to get there.

## Usage

```tsx
<EmptyState
  icon={<Icon search />}
  title="No results found"
  description="Try adjusting your search filters."
/>
```

## Variants

### Bordered

```tsx
<EmptyState
  bordered
  icon={<Icon users />}
  title="No users"
  description="Invite your first team member."
/>
```

### Action

```tsx
<EmptyState
  icon={<Icon fileText />}
  title="No files"
  description="Upload or drag files here."
  actionLabel="Upload files"
/>
```

### Compact

```tsx
<EmptyState
  bordered
  compact
  icon={<Icon chartLine />}
  title="No activity"
  description="Events will appear as they happen."
/>
```

### Success

```tsx
<EmptyState
  success
  icon={<Icon circleCheck />}
  title="No errors"
  description="Everything is running smoothly."
/>
```

### Inside a table

The empty state's action resolves the emptiness it describes: pressing "Clear filters"
drops the filter, so the rows return and the empty state leaves with it. (`Stateful` is a
docs-only helper standing in for your own state; in an app you would hold the filter with
`useState` and clear it in `onAction`.)

```tsx
<Stateful initial={true}>
  {(filtered, setFiltered) => (
    <DataTable
      columns={["Name", "Email", "Role"]}
      rows={filtered ? [] : [
        ["Alice Johnson", "alice@example.com", "Admin"],
        ["Bob Smith", "bob@example.com", "Editor"],
        ["Rachel Chen", "rachel@example.com", "Admin"]
      ]}
      emptyMessage={
        <EmptyState
          icon={<Icon search />}
          title="No results found"
          description="Try adjusting your search filters."
          actionLabel="Clear filters"
          onAction={() => setFiltered(false)}
        />
      }
    />
  )}
</Stateful>
```

## Do & Don't

### search

**Do** — State the result neutrally and point at the lever the user can pull (filters, query).

```tsx
<EmptyState bordered icon={<Icon search />} title="No results found" description="Try adjusting your search filters." />
```

**Don't** — Blaming the searcher for an empty result set makes a normal outcome feel like a mistake.

```tsx
<EmptyState bordered icon={<Icon search />} title="Nothing matched" description="You searched for the wrong thing. Check your spelling and try again." />
```

### users

**Do** — When the user can fix it, give them the one action that does (Invite, Create).

```tsx
<EmptyState bordered icon={<Icon users />} title="No users" description="Invite your first team member." actionLabel="Invite member" />
```

**Don't** — A dead-end that only restates the emptiness leaves the user with nowhere to go.

```tsx
<EmptyState bordered icon={<Icon users />} title="No users" description="There are no team members in this workspace." />
```

### files

**Do** — Name the gesture that fills the empty space so the next step is obvious.

```tsx
<EmptyState bordered icon={<Icon fileText />} title="No files" description="Upload or drag files here." />
```

**Don't** — Generic 'nothing here' copy never tells the user how files would get into the folder.

```tsx
<EmptyState bordered icon={<Icon fileText />} title="Nothing here" description="This folder is empty." />
```

### activity

**Do** — Keep a routinely-empty state calm: muted icon, reassuring copy, no urgency.

```tsx
<EmptyState bordered icon={<Icon chartLine />} title="No activity" description="Events will appear as they happen." />
```

**Don't** — An alarming red icon turns a calm, expected empty feed into a false error.

```tsx
<EmptyState bordered icon={<Icon alertTriangle destructive />} title="No activity" description="Events will appear as they happen." />
```

### notifications

**Do** — Celebrate a cleared queue: 'All caught up' reads as success, not absence.

```tsx
<EmptyState bordered icon={<Icon bell />} title="All caught up" description="No new notifications." />
```

**Don't** — Apologetic, sad-toned copy frames an inbox-zero win as a letdown.

```tsx
<EmptyState bordered icon={<Icon bell />} title="Nothing to see" description="You have no notifications. Sorry, it's quiet in here." />
```

### errors

**Do** — Signal the good news with a green check: zero errors is a passing state, not an empty one.

```tsx
<EmptyState bordered success icon={<Icon circleCheck />} title="No errors" description="Everything is running smoothly." />
```

**Don't** — A grey 'nothing found' disc reads as a failed query, not as a healthy, error-free system.

```tsx
<EmptyState bordered icon={<Icon search />} title="No errors" description="Nothing was found." />
```

### all-clear

**Do** — Reserve the green all-clear for genuinely empty queues: nothing locked, nothing waiting.

```tsx
<EmptyState bordered success icon={<Icon circleCheck />} title="All clear" description="No locked accounts or pending reviews." />
```

**Don't** — A green all-clear over copy that admits work is pending hides the action the user must take.

```tsx
<EmptyState bordered success icon={<Icon circleCheck />} title="No pending reviews" description="3 accounts are locked and waiting on you." />
```
