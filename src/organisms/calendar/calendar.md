# Calendar

Month grid, week timeline, and day timeline in one component. Events mark their days with a dot in the month grid and week strip, and timed events render as blocks on the week/day hour timelines. The view is a semantic boolean axis: pass `week` or `day`, or neither for the month grid (`day` wins over `week` when both are set).

In glass mode the selected day is a brand-tinted control-layer puck behind its
number and event dot, in the month grid and along the week strip; in `range`
mode both endpoints carry the puck over the range band. The day peek and the
hover card are functional-layer glass cards beside their day. Solid mode keeps the
skin's own filled day.

## Usage

A bare calendar is uncontrolled: pressing a day selects it, and in the week/day views the chevrons page the selection a week or a day at a time (crossing into another month hands the press to `onPrev`/`onNext`, since the month itself is a prop).

```tsx
<Calendar
  month="May 2026"
  today={23}
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
/>
```

## Variants

### Events

Each event carries the `day` it falls on, plus an optional `title` and `start`/`end` hours. The month grid marks event days with a dot and reads the count to assistive tech.

```tsx
<Calendar
  month="May 2026"
  today={23}
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
  events={[
    { day: 8, title: "Design review" },
    { day: 14, title: "1:1 with manager" },
    { day: 24, title: "Sprint planning" }
  ]}
/>
```

### Day peek

With `dayPeek`, pressing a marked day opens that day's hour timeline (the same timeline the day view renders) beside the cell: to its right, to its left when the right lacks room, and below it when neither side fits. A tap anywhere else or Escape dismisses it.

```tsx
<Calendar
  dayPeek
  month="May 2026"
  today={23}
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
  events={[
    { day: 24, title: "Sprint planning", start: 9, end: 10.5 },
    { day: 24, title: "Team lunch", start: 12.5, end: 13.5 }
  ]}
/>
```

### Week

`week` renders the selected day's week: a strip of seven selectable day cells over an hour timeline, with each timed event as a block in its day column. The timeline spans the full day; the scroller opens on the 8 AM to 5 PM window and scrolls to the rest, and the 12h/24h control flips the hour labels (12-hour by default). Overlapping events split their column into side-by-side lanes, hovering a block floats its details, and the chevrons page a week at a time.

```tsx
<Calendar
  week
  month="May 2026"
  today={23}
  defaultSelected={20}
  daysInMonth={31}
  startWeekday={4}
  events={[
    { day: 19, title: "Design review", start: 11, end: 12.5 },
    { day: 20, title: "Sprint planning", start: 9.5, end: 11 },
    { day: 21, title: "User interviews", start: 10, end: 12 }
  ]}
/>
```

### Day

`day` renders a single day's hour timeline with each block carrying its title and time span. The timeline covers the whole day (narrow it with `startHour`/`endHour`); the scroller opens on 8 AM to 5 PM and scrolls to the remaining hours, and the 12h/24h control flips the labels. Hovering a block floats a detail card with the event's `description`. The chevrons page a day at a time.

```tsx
<Calendar
  day
  month="May 2026"
  today={23}
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
  events={[
    { day: 24, title: "Sprint planning", start: 9, end: 10.5, description: "Backlog grooming and capacity check for the next sprint." },
    { day: 24, title: "Design review", start: 11.5, end: 13 },
    { day: 24, title: "Team lunch", start: 12.5, end: 13.5 }
  ]}
/>
```

### Range

`range` turns the month grid into a check-in/check-out picker for booking flows: the first press sets the start day, a later press sets the end, and a tinted band spans the days between; pressing an earlier day restarts the pick. Control it with `rangeStart`/`rangeEnd` and `onRangeChange`, or seed it with the `default` pair.

```tsx
<Calendar
  range
  month="May 2026"
  today={23}
  daysInMonth={31}
  startWeekday={4}
  defaultRangeStart={14}
  defaultRangeEnd={20}
/>
```

### Compact

`compact` tightens the cells and type for dense surfaces, in every view.

```tsx
<Calendar
  compact
  month="May 2026"
  today={23}
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
/>
```

## Do & Don't

### Single date

**Do**: Exactly one selected day (primary), with today marked separately in the accent tone.

```tsx
<Calendar month="May 2026" today={23} defaultSelected={24} daysInMonth={31} startWeekday={4} />
```

**Don't**: Painting several days with the primary selected style fakes a multi-select; when you mean a span of days, use `range` instead.

```tsx
<View style={{ width: "auto", borderRadius: 8, borderWidth: 1, borderColor: tokens.border, padding: 12 }}>
  <View style={{ flexDirection: "row", gap: 2 }}>
    <Pressable style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: tokens.primary }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["primary-foreground"] }}>8</Text>
    </Pressable>
    <Pressable style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: tokens.primary }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["primary-foreground"] }}>14</Text>
    </Pressable>
    <Pressable style={{ height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: tokens.primary }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["primary-foreground"] }}>23</Text>
    </Pressable>
  </View>
</View>
```

### Event marks

**Do**: A dot marks a day with events and the count lives in the accessible name; titles belong to the week/day timelines or a side panel.

```tsx
<Calendar
  month="May 2026"
  today={23}
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
  events={[{ day: 8, title: "Design review" }, { day: 14 }, { day: 24, title: "Sprint planning" }]}
/>
```

**Don't**: Cramming event titles into month cells clips them into unreadable slivers and breaks the grid's rhythm.

```tsx
<View style={{ width: "auto", borderRadius: 8, borderWidth: 1, borderColor: tokens.border, padding: 12 }}>
  <View style={{ flexDirection: "row", gap: 2 }}>
    <View style={{ height: 40, width: 36, alignItems: "center", borderRadius: 6 }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>8</Text>
      <Text numberOfLines={1} style={{ fontSize: 7, maxWidth: 34, color: tokens["muted-foreground"] }}>Design review</Text>
    </View>
    <View style={{ height: 40, width: 36, alignItems: "center", borderRadius: 6 }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.foreground }}>9</Text>
    </View>
    <View style={{ height: 40, width: 36, alignItems: "center", borderRadius: 6, backgroundColor: tokens.primary }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["primary-foreground"] }}>10</Text>
      <Text numberOfLines={1} style={{ fontSize: 7, maxWidth: 34, color: tokens["primary-foreground"] }}>Sprint planning meeting</Text>
    </View>
  </View>
</View>
```

### Day details

**Do**: `dayPeek` reveals a pressed day's schedule in place, anchored beside the cell, so detail arrives on demand and the grid stays the single source of truth.

```tsx
<Calendar
  dayPeek
  month="May 2026"
  today={23}
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
  events={[
    { day: 14, title: "1:1 with manager", start: 14, end: 15 },
    { day: 24, title: "Sprint planning", start: 9, end: 10.5 },
    { day: 24, title: "Team lunch", start: 12.5, end: 13.5 }
  ]}
/>
```

**Don't**: Selecting May 24 but leaving a detached panel on a placeholder breaks the link between the grid and its day.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 24 }}>
  <Calendar month="May 2026" today={23} defaultSelected={24} daysInMonth={31} startWeekday={4} />
  <Column fill style={{ minWidth: 240 }}>
    <Card flush>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: tokens["muted-foreground"] }}>Pick a date to see events.</Text>
      </View>
    </Card>
  </Column>
</View>
```

### Hour bounds

**Do**: Keep the full-day timeline and let the scroller do the work: it opens on the 8 AM to 5 PM window, and every event stays reachable.

```tsx
<Calendar
  day
  month="May 2026"
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
  events={[
    { day: 24, title: "Sprint planning", start: 9, end: 10.5 },
    { day: 24, title: "Evening review", start: 18.5, end: 19.5 }
  ]}
/>
```

**Don't**: Narrowing `startHour`/`endHour` below the real schedule silently clips events out of view; the 6:30 PM review never renders here.

```tsx
<Calendar
  day
  month="May 2026"
  defaultSelected={24}
  daysInMonth={31}
  startWeekday={4}
  startHour={9}
  endHour={12}
  events={[
    { day: 24, title: "Sprint planning", start: 9, end: 10.5 },
    { day: 24, title: "Evening review", start: 18.5, end: 19.5 }
  ]}
/>
```

### Booking a stay

**Do**: One `range` calendar carries the whole check-in/check-out pick: the endpoints fill, the nights between band together, and an earlier press restarts.

```tsx
<Calendar
  range
  month="May 2026"
  today={23}
  daysInMonth={31}
  startWeekday={4}
  defaultRangeStart={14}
  defaultRangeEnd={20}
/>
```

**Don't**: Splitting the stay across two single-date calendars doubles the interaction cost and never shows the span at a glance.

```tsx
<Row loose wrap alignStart>
  <Column tight>
    <Typography small muted>Check-in</Typography>
    <Calendar month="May 2026" defaultSelected={14} daysInMonth={31} startWeekday={4} />
  </Column>
  <Column tight>
    <Typography small muted>Check-out</Typography>
    <Calendar month="May 2026" defaultSelected={20} daysInMonth={31} startWeekday={4} />
  </Column>
</Row>
```
