# DataTable

A data table rendered from column and row data, with sorting, row selection, pagination, and the loading and empty states built in. Columns are plain header labels or descriptors (`{ label, numeric, width, sortable, ... }`) for per-column alignment, fixed widths, and sorting; compose a toolbar above when the screen needs one. Density tweaks affect padding live. Pass `onRowEdit` / `onRowDelete` for a trailing actions column: the pencil opens the row's string cells as fields with Save/Cancel (committing via `onRowCommit`), and Delete asks for a confirming second press before it fires. `inlineEdit` skips the pencil and lets a string cell be pressed straight into a field, committing via `onCellCommit`. `onRowPress` makes the whole row act on press and puts the keyboard and screen-reader path on a button in the row's first column, so keep your own controls out of that column when you use it. Data stays yours either way: the table reports intent and re-renders whatever rows it is handed back.

Treat `rows` and `columns` as immutable inputs. When editing data, replace the outer `rows` array and each changed row, as the examples below do. When changing a column, replace its descriptor and the `columns` array. Keep unchanged arrays and callbacks stable for large tables: Canvas caches sorting, paging, and selection summaries so typing a draft or opening a row action does not process the whole data set again. `sortValue` and `rowKey` must be pure functions of their inputs. If either closes over changing external data, supply a new callback identity; for `sortValue`, also replace its column descriptor and the `columns` array. A saved edit appears in sorted order when the updated `rows` arrive.

On narrow web and Android layouts, columns pan horizontally when they exceed
the table width. The overflowing scrollport is a keyboard tab stop, so the
platform's arrow keys can reveal the remaining columns. A table that fits adds
no scrolling tab stop. The iOS compact primary-column layout is unchanged.

## Usage

```tsx
<DataTable
  columns={["Name", "Email", "Role"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin"],
    ["Bob Smith", "bob@example.com", "Editor"],
    ["Rachel Chen", "rachel@example.com", "Admin"]
  ]}
/>
```

## Variants

### Bordered

```tsx
<DataTable
  columns={["Name", "Email", "Role"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin"],
    ["Bob Smith", "bob@example.com", "Editor"],
    ["Rachel Chen", "rachel@example.com", "Admin"]
  ]}
  bordered
/>
```

### Attached

A table that sits flush inside a frame its parent draws (a `flush` Card, a bordered panel that clips to its corners) passes `attached`, so the header band squares its corners to that frame instead of floating as a rounded band; `bordered` implies the same for the table's own outline.

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <DataTable
    attached
    columns={["Name", "Email", "Role"]}
    rows={[
      ["Alice Johnson", "alice@example.com", "Admin"],
      ["Bob Smith", "bob@example.com", "Editor"],
      ["Rachel Chen", "rachel@example.com", "Admin"]
    ]}
  />
</Card>
```

### Striped

```tsx
<DataTable
  columns={["Name", "Email", "Role"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin"],
    ["Bob Smith", "bob@example.com", "Editor"],
    ["Rachel Chen", "rachel@example.com", "Admin"],
    ["Dan Wright", "dan@example.com", "Viewer"]
  ]}
  striped
/>
```

### Compact

```tsx
<DataTable
  columns={["Name", "Email", "Role"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin"],
    ["Bob Smith", "bob@example.com", "Editor"],
    ["Rachel Chen", "rachel@example.com", "Admin"]
  ]}
  compact
/>
```

### Comfortable

```tsx
<DataTable
  columns={["Name", "Email", "Role"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin"],
    ["Bob Smith", "bob@example.com", "Editor"],
    ["Rachel Chen", "rachel@example.com", "Admin"]
  ]}
  comfortable
/>
```

### Loading

```tsx
<DataTable
  columns={["Name", "Email", "Status"]}
  rows={[]}
  loading
/>
```

### Empty

```tsx
<DataTable
  columns={["Name", "Email", "Status"]}
  rows={[]}
  emptyMessage="No results found."
/>
```

### Sortable

```tsx
<DataTable
  columns={["Name", "Email", "Role"]}
  rows={[
    ["Rachel Chen", "rachel@example.com", "Admin"],
    ["Alice Johnson", "alice@example.com", "Admin"],
    ["Bob Smith", "bob@example.com", "Editor"]
  ]}
  sortable
  defaultSort={{ column: "Name" }}
/>
```

### Selectable

```tsx
<DataTable
  columns={["Name", "Email", "Role"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin"],
    ["Bob Smith", "bob@example.com", "Editor"],
    ["Rachel Chen", "rachel@example.com", "Admin"]
  ]}
  selectable
  defaultSelectedKeys={[1]}
/>
```

### Paginated

```tsx
<DataTable
  columns={["Employee", "Team"]}
  rows={Array.from({ length: 23 }, (_, i) => [
    `Employee ${i + 1}`,
    ["Design", "Platform", "Growth"][i % 3]
  ])}
  paginated
  pageSize={5}
/>
```

### Numeric and custom columns

```tsx
<DataTable
  columns={[
    "Invoice",
    { label: "Status", centered: true, width: 120 },
    { label: "Amount", numeric: true }
  ]}
  rows={[
    ["INV-0041", <Badge success>Paid</Badge>, "$1,250.00"],
    ["INV-0042", <Badge warning>Due</Badge>, "$450.00"],
    ["INV-0043", <Badge neutral>Draft</Badge>, "$8,120.00"]
  ]}
/>
```

### Sparkline trend column

```tsx
<DataTable
  columns={["Page", "7D", "Visits"]}
  rows={[
    ["/pricing", <Sparkline values={[52, 60, 55, 71, 68, 84, 96]} />, "12,480"],
    ["/docs", <Sparkline values={[88, 74, 70, 66, 58, 49, 41]} />, "8,102"],
    ["/blog", <Sparkline values={[34, 42, 39, 51, 60, 66, 78]} />, "5,914"]
  ]}
/>
```

### Avatar identity cells

```tsx
<DataTable
  columns={["Member", "Role"]}
  rows={[
    [<MediaObject compact avatar="AJ" title="Alice Johnson" />, "Admin"],
    [<MediaObject compact avatar="BS" title="Bob Smith" />, "Editor"],
    [<MediaObject compact avatar="RC" title="Rachel Chen" />, "Admin"]
  ]}
/>
```

### Row actions

```tsx
<Stateful initial={[
  ["Alice Johnson", "alice@example.com", "Admin"],
  ["Bob Smith", "bob@example.com", "Editor"],
  ["Rachel Chen", "rachel@example.com", "Viewer"]
]}>
  {(rows, setRows) => (
    <DataTable
      columns={["Name", "Email", "Role"]}
      rows={rows}
      onRowEdit={() => {}}
      onRowCommit={(i, cells) => setRows(rows.map((row, r) => (r === i ? cells.map(String) : row)))}
      onRowDelete={(i) => setRows(rows.filter((_row, r) => r !== i))}
    />
  )}
</Stateful>
```

### Inline editing

```tsx
<Stateful initial={[
  ["/pricing", "12,480"],
  ["/docs", "8,102"],
  ["/blog", "5,914"]
]}>
  {(rows, setRows) => (
    <DataTable
      columns={["Page", "Visits"]}
      rows={rows}
      inlineEdit
      onCellCommit={(i, c, next) =>
        setRows(rows.map((row, r) => (r === i ? row.map((cell, ci) => (ci === c ? next : cell)) : row)))
      }
    />
  )}
</Stateful>
```

## Do & Don't

### default

**Do** — Use the built-in paginated footer so the search result is always anchored to the total.

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <Row snug alignCenter between pad>
    <Input small placeholder="Search users..." />
    <Button outline small>Export</Button>
  </Row>
  <Divider />
  <DataTable attached paginated pageSize={3} columns={["Name", "Email"]} rows={[
    ["Alice Johnson", "alice@example.com"],
    ["Bob Smith", "bob@example.com"],
    ["Rachel Chen", "rachel@example.com"],
    ["Dan Wright", "dan@example.com"],
    ["Eve Park", "eve@example.com"]
  ]} />
</Card>
```

**Don't** — Wiring search but dropping the footer leaves the user with no result count or way to page through 142 rows.

```tsx
<View style={{ overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: tokens.border, maxWidth: 520 }}>
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderColor: tokens.border, padding: 12 }}>
    <Container xs start><Input small placeholder="Search users..." /></Container>
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%" }} />
    <Button outline small>Export</Button>
  </View>
  <DataTable columns={["Name", "Email"]} rows={[
    ["Alice Johnson", "alice@example.com"],
    ["Bob Smith", "bob@example.com"],
    ["Rachel Chen", "rachel@example.com"]
  ]} />
</View>
```

### bulk

**Do** — Pair the selection with a bulk bar that leads with the non-destructive action and keeps Delete visually distinct.

```tsx
<Card flat flush style={{ overflow: "hidden" }}>
  <Row snug alignCenter between pad>
    <Typography tiny muted>2 selected</Typography>
    <Row snug alignCenter>
      <Button outline small>Bulk edit</Button>
      <Button destructive small>Delete</Button>
    </Row>
  </Row>
  <Divider />
  <DataTable attached selectable defaultSelectedKeys={[0, 2]} columns={["Name", "Email"]} rows={[
    ["Alice Johnson", "alice@example.com"],
    ["Bob Smith", "bob@example.com"],
    ["Rachel Chen", "rachel@example.com"]
  ]} />
</Card>
```

**Don't** — Surfacing only the destructive Delete on a selection invites accidental data loss with no safer path.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, padding: 12, maxWidth: 520 }}>
  <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>3 selected</Text>
  <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: "0%" }} />
  <Button destructive small>Delete</Button>
</View>
```

### filter

**Do** — Echo the live result count next to the filter so its effect is visible.

```tsx
  <Card flat padded>
    <Row snug alignCenter between>
      <Row snug alignCenter>
        <Typography tiny muted>Status:</Typography>
        <Column><Select value="All" options={["All", "Active", "Inactive"]} small /></Column>
      </Row>
      <Typography tiny muted>142 results</Typography>
    </Row>
  </Card>
```

**Don't** — A filter control with no result count leaves the user guessing whether the filter narrowed anything.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, borderColor: tokens.border, padding: 12, maxWidth: 520 }}>
  <Text style={{ fontSize: 12, lineHeight: 16, color: tokens["muted-foreground"] }}>Status:</Text>
  <Select value="All" options={["All", "Active", "Inactive"]} small />
</View>
```

### empty

**Do** — Keep the header and let the built-in emptyMessage span a centered row so the structure stays intact.

```tsx
  <DataTable bordered columns={["Name", "Email", "Status"]} rows={[]} emptyMessage="No results found." />
```

**Don't** — Hiding the body entirely on no results collapses the table and looks broken.

```tsx
  <DataTable bordered columns={["Name", "Email", "Status"]} rows={[]} />
```

### loading

**Do** — Use the built-in loading skeletons so the load reads as the table taking shape in place.

```tsx
  <DataTable bordered loading columns={["Name", "Email", "Status"]} rows={[]} />
```

**Don't** — A bare "Loading…" string gives no sense of progress and reads like static content.

```tsx
<View style={{ overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: tokens.border, maxWidth: 520 }}>
  <DataTable columns={["Name", "Email", "Status"]} rows={[]} />
  <View style={{ alignItems: "center", paddingHorizontal: 16, paddingVertical: 32 }}>
    <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Loading…</Text>
  </View>
</View>
```
