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
  columns={["Name", "Email", "Role", "Status"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin", "Active"],
    ["Bob Smith", "bob@example.com", "Editor", "Inactive"],
    ["Rachel Chen", "rachel@example.com", "Admin", "Active"]
  ]}
  bordered
  sortable
/>
```

## Variants

### Sortable

```tsx
<DataTable
  columns={["Name", "Email", "Role"]}
  rows={[
    ["Rachel Chen", "rachel@example.com", "Admin"],
    ["Alice Johnson", "alice@example.com", "Admin"],
    ["Dan Wright", "dan@example.com", "Viewer"],
    ["Bob Smith", "bob@example.com", "Editor"]
  ]}
  bordered
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
  bordered
  selectable
  defaultSelectedKeys={[1]}
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
      bordered
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
      columns={["Page", { label: "Visits", numeric: true }]}
      rows={rows}
      bordered
      inlineEdit
      onCellCommit={(i, c, next) =>
        setRows(rows.map((row, r) => (r === i ? row.map((cell, ci) => (ci === c ? next : cell)) : row)))
      }
    />
  )}
</Stateful>
```

### Paginated

```tsx
<DataTable
  columns={["Employee", "Team"]}
  rows={Array.from({ length: 23 }, (_, i) => [
    `Employee ${i + 1}`,
    ["Design", "Platform", "Growth"][i % 3]
  ])}
  bordered
  selectable
  paginated
  pageSize={5}
/>
```

### Numeric and custom columns

```tsx
<DataTable
  columns={[
    "Invoice",
    { label: "Status", centered: true, width: 120, sortable: false },
    { label: "Amount", numeric: true, sortValue: (cell) => Number(String(cell).replace(/[^0-9.]/g, "")) }
  ]}
  rows={[
    ["INV-0041", <Badge success>Paid</Badge>, "$1,250.00"],
    ["INV-0042", <Badge warning>Due</Badge>, "$450.00"],
    ["INV-0043", <Badge neutral>Draft</Badge>, "$8,120.00"],
    ["INV-0044", <Badge success>Paid</Badge>, "$96.00"]
  ]}
  bordered
  sortable
  defaultSort={{ column: "Amount", descending: true }}
/>
```

### Sparkline trend column

```tsx
<DataTable
  columns={[
    "Page",
    { label: "7D", centered: true, width: 120, sortValue: (_cell, _row, i) => [96, 41, 78][i] },
    { label: "Visits", numeric: true, sortValue: (cell) => Number(String(cell).replace(/[^0-9.]/g, "")) }
  ]}
  rows={[
    ["/pricing", <Sparkline values={[52, 60, 55, 71, 68, 84, 96]} />, "12,480"],
    ["/docs", <Sparkline values={[88, 74, 70, 66, 58, 49, 41]} destructive />, "8,102"],
    ["/blog", <Sparkline values={[34, 42, 39, 51, 60, 66, 78]} success />, "5,914"]
  ]}
  bordered
  sortable
/>
```

### Avatar identity cells

```tsx
<DataTable
  columns={[
    { label: "Member", sortValue: (_cell, _row, i) => ["Alice Johnson", "Bob Smith", "Rachel Chen"][i] },
    "Role",
    { label: "Status", centered: true, width: 120 }
  ]}
  rows={[
    [
      <Row snug alignCenter>
        <Avatar small name="Alice Johnson" />
        <Typography small medium>Alice Johnson</Typography>
      </Row>,
      "Admin",
      <Badge success>Active</Badge>
    ],
    [
      <Row snug alignCenter>
        <Avatar small name="Bob Smith" />
        <Typography small medium>Bob Smith</Typography>
      </Row>,
      "Editor",
      <Badge neutral>Invited</Badge>
    ],
    [
      <Row snug alignCenter>
        <Avatar small name="Rachel Chen" />
        <Typography small medium>Rachel Chen</Typography>
      </Row>,
      "Admin",
      <Badge success>Active</Badge>
    ]
  ]}
  bordered
  sortable
/>
```

### Striped

```tsx
<DataTable
  columns={["Name", "Email", "Role", "Status"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin", "Active"],
    ["Bob Smith", "bob@example.com", "Editor", "Inactive"],
    ["Rachel Chen", "rachel@example.com", "Admin", "Active"],
    ["Dan Wright", "dan@example.com", "Viewer", "Active"]
  ]}
  bordered
  striped
/>
```

### Compact

```tsx
<DataTable
  columns={["Name", "Email", "Role", "Status"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin", "Active"],
    ["Bob Smith", "bob@example.com", "Editor", "Inactive"],
    ["Rachel Chen", "rachel@example.com", "Admin", "Active"]
  ]}
  bordered
  compact
/>
```

### Comfortable

```tsx
<DataTable
  columns={["Name", "Email", "Role", "Status"]}
  rows={[
    ["Alice Johnson", "alice@example.com", "Admin", "Active"],
    ["Bob Smith", "bob@example.com", "Editor", "Inactive"],
    ["Rachel Chen", "rachel@example.com", "Admin", "Active"]
  ]}
  bordered
  comfortable
/>
```

### Loading

```tsx
<DataTable
  columns={["Name", "Email", "Status"]}
  rows={[]}
  bordered
  loading
/>
```

### Empty

```tsx
<DataTable
  columns={["Name", "Email", "Status"]}
  rows={[]}
  bordered
  emptyMessage="No results found."
/>
```

## Do & Don't

### default

**Do** — Use the built-in paginated footer so the search result is always anchored to the total.

```tsx
<Container lg>
  <Card flat flush style={{ overflow: "hidden" }}>
    <Row snug alignCenter between pad>
      <Input small placeholder="Search users..." />
      <Button outline small>Export</Button>
    </Row>
    <Divider />
    <DataTable paginated pageSize={3} columns={["Name", "Email"]} rows={[
      ["Alice Johnson", "alice@example.com"],
      ["Bob Smith", "bob@example.com"],
      ["Rachel Chen", "rachel@example.com"],
      ["Dan Wright", "dan@example.com"],
      ["Eve Park", "eve@example.com"]
    ]} />
  </Card>
</Container>
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
<Container lg>
  <Card flat flush style={{ overflow: "hidden" }}>
    <Row snug alignCenter between pad>
      <Typography tiny muted>2 selected</Typography>
      <Row snug alignCenter>
        <Button outline small>Bulk edit</Button>
        <Button destructive small>Delete</Button>
      </Row>
    </Row>
    <Divider />
    <DataTable selectable defaultSelectedKeys={[0, 2]} columns={["Name", "Email"]} rows={[
      ["Alice Johnson", "alice@example.com"],
      ["Bob Smith", "bob@example.com"],
      ["Rachel Chen", "rachel@example.com"]
    ]} />
  </Card>
</Container>
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
<Container lg>
    <Card flat padded>
      <Row snug alignCenter between>
        <Row snug alignCenter>
          <Typography tiny muted>Status:</Typography>
          <Column><Select value="All" options={["All", "Active", "Inactive"]} small /></Column>
        </Row>
        <Typography tiny muted>142 results</Typography>
      </Row>
    </Card>
</Container>
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
<Container lg>
    <DataTable bordered columns={["Name", "Email", "Status"]} rows={[]} emptyMessage="No results found." />
</Container>
```

**Don't** — Hiding the body entirely on no results collapses the table and looks broken.

```tsx
<Container lg>
    <DataTable bordered columns={["Name", "Email", "Status"]} rows={[]} />
</Container>
```

### loading

**Do** — Use the built-in loading skeletons so the load reads as the table taking shape in place.

```tsx
<Container lg>
    <DataTable bordered loading columns={["Name", "Email", "Status"]} rows={[]} />
</Container>
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
