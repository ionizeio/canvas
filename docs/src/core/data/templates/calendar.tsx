import { Fragment, useState } from "react";
import { Row, Column, Card, CardHeader, CardSeparator, CardContent, Typography, Button, Badge, Calendar, Divider, Icon, useFormFactor, useToast } from "@ionizeio/canvas";
import type { TemplateDoc } from "../types";

// Month-view calendar built from real Canvas components: the Calendar organism
// beside the selected day's event Card. The demo carries three months of data;
// prev/next (both the page-header Buttons and the Calendar's own chevrons)
// really switch months, Today jumps back to May 24, and selecting a day keeps
// the event panel in sync.

interface DemoEvent {
  title: string;
  time: string;
}

interface DemoMonth {
  /** Header label, e.g. "May 2026". */
  label: string;
  /** Short month name for the event-panel heading, e.g. "May". */
  short: string;
  daysInMonth: number;
  /** Weekday (0=Sun .. 6=Sat) the 1st falls on. */
  startWeekday: number;
  /** The day that is "today" in the demo fiction (only May has one). */
  today?: number;
  /** Demo day -> events map; days missing here are free. */
  events: Record<number, DemoEvent[]>;
}

const MONTHS: DemoMonth[] = [
  {
    label: "April 2026",
    short: "Apr",
    daysInMonth: 30,
    startWeekday: 3,
    events: {
      9: [{ title: "Quarterly planning", time: "10:00 AM" }],
      21: [{ title: "Design crit", time: "3:00 PM" }],
    },
  },
  {
    label: "May 2026",
    short: "May",
    daysInMonth: 31,
    startWeekday: 5,
    today: 24,
    events: {
      5: [{ title: "Team sync", time: "10:00 AM" }],
      8: [{ title: "Deploy v3", time: "4:00 PM" }],
      14: [{ title: "Sprint review", time: "1:00 PM" }],
      24: [
        { title: "Sprint planning", time: "9:00 AM" },
        { title: "Design review", time: "11:30 AM" },
        { title: "1:1 with manager", time: "2:00 PM" },
      ],
    },
  },
  {
    label: "June 2026",
    short: "Jun",
    daysInMonth: 30,
    startWeekday: 1,
    events: {
      2: [{ title: "Roadmap review", time: "11:00 AM" }],
      18: [{ title: "Offsite kickoff", time: "9:30 AM" }],
    },
  },
];

// The demo's "today": May 24, 2026 (matching the Calendar's `today` highlight).
const TODAY_MONTH = 1;
const TODAY_DAY = 24;

function MonthViewLive() {
  const { toast } = useToast();
  // Phone stacks grid over panel AND flips the Calendar to `compact`, so the
  // flag stays a hook (it drives a prop, and the stacked/wide branches use
  // different gap scales, which a Row `stacks` would collapse into one).
  const narrow = useFormFactor() === "phone";
  const [monthIndex, setMonthIndex] = useState(TODAY_MONTH);
  const [selected, setSelected] = useState(TODAY_DAY);
  const month = MONTHS[monthIndex];
  const events = month.events[selected] ?? [];
  const eventDays = Object.keys(month.events)
    .map(Number)
    .sort((a, b) => a - b);

  const goTo = (index: number) => {
    setMonthIndex(index);
    // Keep the day-of-month when it exists in the new month (May 31 -> Jun 30).
    setSelected((day) => Math.min(day, MONTHS[index].daysInMonth));
  };
  const prevMonth = () => {
    if (monthIndex === 0) {
      toast({ message: "Start of the demo range", description: "This demo covers April through June 2026." });
      return;
    }
    goTo(monthIndex - 1);
  };
  const nextMonth = () => {
    if (monthIndex === MONTHS.length - 1) {
      toast({ message: "End of the demo range", description: "This demo covers April through June 2026." });
      return;
    }
    goTo(monthIndex + 1);
  };
  const goToday = () => {
    if (monthIndex === TODAY_MONTH && selected === TODAY_DAY) {
      toast({ message: "Already on today", description: "May 24, 2026 is selected." });
      return;
    }
    setMonthIndex(TODAY_MONTH);
    setSelected(TODAY_DAY);
  };

  const header = (
    <Row between alignCenter wrap>
      <Column tight>
        <Typography h4>Calendar</Typography>
        <Typography small muted>{month.label}</Typography>
      </Column>
      <Row snug alignCenter>
        <Button ghost icon small accessibilityLabel="Previous month" iconLeft={<Icon chevronLeft size={16} />} onPress={prevMonth} />
        <Button outline small onPress={goToday}>Today</Button>
        <Button ghost icon small accessibilityLabel="Next month" iconLeft={<Icon chevronRight size={16} />} onPress={nextMonth} />
      </Row>
    </Row>
  );

  const grid = (
    <Calendar
      month={month.label}
      today={month.today}
      daysInMonth={month.daysInMonth}
      startWeekday={month.startWeekday}
      selected={selected}
      onSelect={setSelected}
      onPrev={prevMonth}
      onNext={nextMonth}
      compact={narrow}
    />
  );

  const panel = (
    <Card grow flush>
      <CardHeader>
        <Row between alignCenter>
          <Typography small semibold>{`${month.short} ${selected}`}</Typography>
          <Badge secondary>{events.length === 0 ? "Free" : `${events.length} ${events.length === 1 ? "event" : "events"}`}</Badge>
        </Row>
      </CardHeader>
      <CardSeparator />
      <CardContent>
        {events.length === 0 ? (
          <Column tight>
            <Typography small muted>{`No events on ${month.short} ${selected}.`}</Typography>
            <Typography tiny>{`Days with events this month: ${eventDays.join(", ")}.`}</Typography>
          </Column>
        ) : (
          <Column tight>
            {events.map((ev, i) => (
              <Fragment key={ev.title}>
                {i > 0 ? <Divider /> : null}
                <Row between alignCenter>
                  <Typography small medium>{ev.title}</Typography>
                  <Typography small muted>{ev.time}</Typography>
                </Row>
              </Fragment>
            ))}
          </Column>
        )}
      </CardContent>
    </Card>
  );

  if (narrow) {
    return (
      <Column relaxed>
        {header}
        {grid}
        {panel}
      </Column>
    );
  }
  return (
    <Column relaxed>
      {header}
      <Row loose wrap alignStart>
        {grid}
        <Column fill style={{ minWidth: 240 }}>{panel}</Column>
      </Row>
    </Column>
  );
}

export const CALENDAR_TEMPLATE: TemplateDoc = {
  slug: "calendar",
  name: "Calendar",
  description: "Month-view calendar with month navigation, a Today jump, and a synced event panel for the selected day. Built from live Canvas components.",
  sections: [
    {
      title: "Month view",
      anatomy: "Page header (title + prev/next icon Buttons + Today) over the Calendar organism beside the selected day's event Card; selecting a day syncs the panel, and the panes stack below the sm breakpoint.",
      render: () => <MonthViewLive />,
    },
  ],
};
