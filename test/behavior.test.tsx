import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import type { TextInput } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { layoutEntrances } from "./entrance-layout.ts";
import { resetDevWarnings } from "../src/style/dev-warn.ts";
import { Pagination } from "../src/atoms/pagination/pagination.tsx";
import { Radio } from "../src/atoms/radio/radio.tsx";
import { RadioGroup } from "../src/atoms/radio/radio-group.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { Listbox } from "../src/atoms/listbox/listbox.tsx";
import { Calendar } from "../src/organisms/calendar/calendar.tsx";
import { DataTable } from "../src/organisms/data-table/data-table.tsx";

// Behavior tests for the interactive components' real logic (paging clamp, query
// filtering, date selection, radio toggle) — not just rendering.

afterEach(cleanup);
const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);

describe("Pagination", () => {
  it("reports the clicked page number", () => {
    let page = 2;
    ui(<Pagination page={2} total={5} onChange={(p) => { page = p; }} />);
    fireEvent.click(screen.getByText("4"));
    expect(page).toBe(4);
  });

  it("does not fire onChange when Previous is pressed on page 1", () => {
    let called = false;
    const { container } = ui(<Pagination page={1} total={5} onChange={() => { called = true; }} />);
    const prev = container.querySelector('[aria-label="Previous page"]');
    expect(prev).not.toBeNull();
    fireEvent.click(prev as Element);
    expect(called).toBe(false);
  });
});

describe("Autocomplete", () => {
  it("filters the option list by the query", () => {
    const { container } = ui(
      <Autocomplete open options={["Apple", "Banana", "Avocado"]} query="av" onSelect={() => {}} />,
    );
    layoutEntrances(container, { width: 320, height: 144 });
    const opts = container.querySelectorAll('[role="option"]');
    expect(opts.length).toBe(1);
    expect(opts[0].textContent?.includes("Avocado")).toBe(true);
  });

  it("shows a no-results state when nothing matches", () => {
    ui(<Autocomplete open options={["Apple", "Banana"]} query="zzz" onSelect={() => {}} />);
    layoutEntrances(document.body, { width: 320, height: 48 });
    expect(screen.getByText("No results")).toBeDefined();
  });

  it("is typeable out of the box: keystrokes filter the list (uncontrolled query)", () => {
    const { container } = ui(<Autocomplete open options={["Apple", "Banana", "Avocado"]} onSelect={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "ban" } });
    layoutEntrances(container, { width: 320, height: 144 });
    const opts = container.querySelectorAll('[role="option"]');
    expect(opts.length).toBe(1);
    expect(opts[0].textContent?.includes("Banana")).toBe(true);
  });

  it("reports each keystroke through onQueryChange", () => {
    let typed = "";
    ui(<Autocomplete open options={["Apple"]} onQueryChange={(q) => { typed = q; }} />);
    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "ap" } });
    expect(typed).toBe("ap");
  });

  it("seeds the filter from defaultQuery and forwards a ref to the text field", () => {
    const ref = createRef<TextInput>();
    const { container } = ui(
      <Autocomplete ref={ref} open defaultQuery="av" options={["Apple", "Banana", "Avocado"]} onSelect={() => {}} />,
    );
    layoutEntrances(container, { width: 320, height: 144 });
    expect(container.querySelectorAll('[role="option"]').length).toBe(1);
    expect(typeof ref.current?.focus).toBe("function");
  });

  it("resets the query on select so the field falls back to the value", () => {
    let query = "unset";
    const { container } = ui(
      <Autocomplete open defaultQuery="av" options={["Avocado"]} onSelect={() => {}} onQueryChange={(q) => { query = q; }} />,
    );
    layoutEntrances(container, { width: 320, height: 48 });
    fireEvent.click(screen.getByRole("option", { name: "Avocado" }));
    expect(query).toBe("");
  });

  it("shows the selected value in the field when there is no query", () => {
    ui(<Autocomplete options={["Devon Webb"]} value="Devon Webb" onSelect={() => {}} />);
    expect(screen.getByDisplayValue("Devon Webb")).toBeDefined();
  });

  it("clears the selection when the field is erased, so the value does not snap back (uncontrolled)", () => {
    const { container } = ui(
      <Autocomplete open defaultValue="Devon Webb" options={["Devon Webb", "Tom Cook"]} onSelect={() => {}} />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    // At rest the field shows the committed selection via the display fallback.
    expect(input.value).toBe("Devon Webb");
    // Erasing to empty must leave the field empty, not snap the value back in.
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
  });

  it("sets a displayName for DevTools/stack traces", () => {
    expect((Autocomplete as { displayName?: string }).displayName).toBe("Autocomplete");
  });
});

describe("Calendar", () => {
  it("reports the clicked day and marks the selected day", () => {
    let picked = 0;
    const { container } = ui(<Calendar selected={10} onSelect={(d) => { picked = d; }} />);
    const sel = container.querySelector('[aria-pressed="true"]');
    expect(sel?.textContent).toBe("10");
    fireEvent.click(screen.getByText("15"));
    expect(picked).toBe(15);
  });

  it("marks days with events and counts them in the accessible name", () => {
    const { container } = ui(
      <Calendar selected={10} events={[{ day: 15 }, { day: 15, title: "Review", start: 11 }, { day: 20 }]} />,
    );
    expect(container.querySelector('[aria-label="15, 2 events"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="20, 1 event"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="16"]')).not.toBeNull();
  });

  it("week view shows the selected day's week and pages by week within the month", () => {
    let crossed = false;
    const { container } = ui(
      <Calendar week defaultSelected={10} daysInMonth={30} startWeekday={1} onPrev={() => { crossed = true; }} />,
    );
    // startWeekday=1 → day 10 falls in the week of days 7..13.
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("13")).toBeTruthy();
    expect(screen.queryByText("14")).toBeNull();
    const prev = container.querySelector('[aria-label="Previous week"]') as Element;
    fireEvent.click(prev); // pages to the partial first week, selecting its first in-month day
    expect(container.querySelector('[aria-label="1, selected"]')).not.toBeNull();
    fireEvent.click(prev); // already the first week → hands the press to onPrev
    expect(crossed).toBe(true);
  });

  it("day view renders the timed events with their hours and pages by day", () => {
    const { container } = ui(
      <Calendar
        day
        month="May 2026"
        defaultSelected={24}
        daysInMonth={31}
        startWeekday={4}
        events={[{ day: 24, title: "Sprint planning", start: 9 }, { day: 24, title: "Design review", start: 11.5, end: 13 }]}
      />,
    );
    expect(screen.getByText("Sprint planning")).toBeTruthy();
    expect(screen.getByText("11:30 AM – 1 PM")).toBeTruthy();
    // startWeekday 4 puts the 1st on Thursday → the 24th lands on Saturday.
    expect(screen.getByText("Saturday, May 24")).toBeTruthy();
    fireEvent.click(container.querySelector('[aria-label="Next day"]') as Element);
    expect(screen.getByText("Sunday, May 25")).toBeTruthy();
  });

  it("dayPeek opens the pressed day's timeline in a peek card and skips event-less days", () => {
    const { container } = ui(
      <Calendar
        dayPeek
        month="May 2026"
        daysInMonth={31}
        startWeekday={4}
        events={[
          { day: 24, title: "Sprint planning", start: 9, end: 10.5 },
          { day: 14, title: "1:1 with manager", start: 14 },
          { day: 8, title: "Offsite" },
        ]}
      />,
    );
    // Closed until a day with events is pressed.
    expect(screen.queryByText("Saturday, May 24")).toBeNull();
    fireEvent.click(container.querySelector('[aria-label="24, 1 event"]') as Element);
    expect(screen.getByText("Saturday, May 24")).toBeTruthy();
    expect(screen.getByText("Sprint planning")).toBeTruthy();
    expect(screen.getByText("9 AM – 10:30 AM")).toBeTruthy();
    // Pressing another event day moves the peek there.
    fireEvent.click(container.querySelector('[aria-label="14, 1 event"]') as Element);
    expect(screen.queryByText("Saturday, May 24")).toBeNull();
    expect(screen.getByText("Wednesday, May 14")).toBeTruthy();
    // An untimed event lists as a title row (no timeline needed).
    fireEvent.click(container.querySelector('[aria-label="8, 1 event"]') as Element);
    expect(screen.getByText("Offsite")).toBeTruthy();
    // An event-less day closes the peek instead of showing an empty card.
    fireEvent.click(screen.getByText("16"));
    expect(screen.queryByText(/May 16/)).toBeNull();
    expect(screen.queryByText("Offsite")).toBeNull();
  });

  it("placeOverlay prefers the trigger's right, then left, then centered-below", async () => {
    const { placeOverlay } = await import("../src/style/anchored-overlay.tsx");
    const gap = 6;
    // Trigger near the outlet's left edge: room on the right → right, top-aligned.
    const leftCell = { x: 20, y: 100, width: 36, height: 36 };
    expect(placeOverlay(leftCell, { cardWidth: 300, preferSide: true, gap, outletWidth: 800 }))
      .toEqual({ left: 20 + 36 + gap, top: 100 });
    // Trigger near the right edge: no room right, room left → left of the cell.
    const rightCell = { x: 700, y: 100, width: 36, height: 36 };
    expect(placeOverlay(rightCell, { cardWidth: 300, preferSide: true, gap, outletWidth: 800 }))
      .toEqual({ left: 700 - gap - 300, top: 100 });
    // Narrow outlet: neither side fits → below, clamped to the 8px inset.
    const narrowCell = { x: 40, y: 100, width: 36, height: 36 };
    expect(placeOverlay(narrowCell, { cardWidth: 300, preferSide: true, gap, outletWidth: 340 }))
      .toEqual({ left: 8, top: 100 + 36 + gap });
    // Legacy shape without a known width is untouched: left-aligned below.
    expect(placeOverlay(leftCell, { gap, outletWidth: 800 })).toEqual({ left: 20, top: 100 + 36 + gap });
  });

  it("placeOverlay pins the trailing edge for alignEnd, mirrored in a right-to-left locale", async () => {
    const { placeOverlay } = await import("../src/style/anchored-overlay.tsx");
    const gap = 4;
    // A trigger parked near the end of an 800px surface.
    const trigger = { x: 600, y: 40, width: 120, height: 32 };
    const top = 40 + 32 + gap;
    // Left-to-right: trailing is the physical right, expressed as the inset from
    // the outlet's right edge (800 - 720). No card measurement is involved, so
    // there is no measure-then-shift second pass.
    expect(placeOverlay(trigger, { alignEnd: true, gap, outletWidth: 800 })).toEqual({ right: 80, top });
    // Right-to-left mirrors it: trailing is the physical left, i.e. the trigger's x.
    expect(placeOverlay(trigger, { alignEnd: true, rtl: true, gap, outletWidth: 800 })).toEqual({ left: 600, top });
    // Leading alignment under RTL pins the physical right for the same reason.
    expect(placeOverlay(trigger, { rtl: true, gap, outletWidth: 800 })).toEqual({ right: 80, top });
    // The default (left-to-right, no alignEnd) is untouched: physical left.
    expect(placeOverlay(trigger, { gap, outletWidth: 800 })).toEqual({ left: 600, top });
    // Outlet width not measured yet: fall back to the leading anchor rather than
    // guess an inset the card would then jump out of.
    expect(placeOverlay(trigger, { alignEnd: true, gap, outletWidth: null })).toEqual({ left: 600, top });
  });

  it("day timeline spans the full day, 12-hour labels by default, and the toggle flips to 24-hour", () => {
    ui(
      <Calendar
        day
        month="May 2026"
        defaultSelected={24}
        daysInMonth={31}
        startWeekday={4}
        events={[{ day: 24, title: "Standup", start: 9, end: 9.5 }]}
      />,
    );
    // Full-day axis: hours outside the old 8–18 window exist (scrolled to, but rendered).
    expect(screen.getByText("12 AM")).toBeTruthy();
    expect(screen.getByText("11 PM")).toBeTruthy();
    expect(screen.getByText("9 AM – 9:30 AM")).toBeTruthy();
    // The built-in toggle flips every label to 24-hour form.
    fireEvent.click(screen.getByText("24h"));
    expect(screen.getByText("23:00")).toBeTruthy();
    expect(screen.getByText("09:00 – 09:30")).toBeTruthy();
    fireEvent.click(screen.getByText("12h"));
    expect(screen.getByText("11 PM")).toBeTruthy();
  });

  it("hovering an event block floats its detail card with the description", () => {
    const { container } = ui(
      <Calendar
        day
        month="May 2026"
        defaultSelected={24}
        daysInMonth={31}
        startWeekday={4}
        events={[{ day: 24, title: "Design review", start: 11.5, end: 13, description: "Figma walkthrough of the checkout flow." }]}
      />,
    );
    expect(screen.queryByText("Figma walkthrough of the checkout flow.")).toBeNull();
    const block = container.querySelector('[aria-label="Design review, 11:30 AM to 1 PM"]') as Element;
    // react-native-web binds hover to pointer events when PointerEvent exists.
    fireEvent.pointerEnter(block);
    expect(screen.getByText("Figma walkthrough of the checkout flow.")).toBeTruthy();
    expect(screen.getByText("Saturday, May 24 · 11:30 AM – 1 PM")).toBeTruthy();
    fireEvent.pointerLeave(block);
    expect(screen.queryByText("Figma walkthrough of the checkout flow.")).toBeNull();
  });

  it("range mode picks start then end, restarts on an earlier press, and bands the days between", () => {
    const picks: [number | undefined, number | undefined][] = [];
    const { container } = ui(
      <Calendar
        range
        month="May 2026"
        daysInMonth={31}
        startWeekday={4}
        onRangeChange={(s, e) => picks.push([s, e])}
      />,
    );
    fireEvent.click(screen.getByText("14"));
    expect(picks.at(-1)).toEqual([14, undefined]);
    expect(container.querySelector('[aria-label="14, selected, start of range"]')).not.toBeNull();
    fireEvent.click(screen.getByText("20"));
    expect(picks.at(-1)).toEqual([14, 20]);
    expect(container.querySelector('[aria-label="20, selected, end of range"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="17, in range"]')).not.toBeNull();
    // A press before the start restarts the pick.
    fireEvent.click(screen.getByText("5"));
    expect(picks.at(-1)).toEqual([5, undefined]);
    expect(container.querySelector('[aria-label="17, in range"]')).toBeNull();
  });

  it("fires onEventPress with the pressed event block", () => {
    let pressed = "";
    ui(
      <Calendar
        day
        defaultSelected={10}
        events={[{ day: 10, title: "Standup", start: 9, end: 9.5 }]}
        onEventPress={(e) => { pressed = e.title ?? ""; }}
      />,
    );
    fireEvent.click(screen.getByText("Standup"));
    expect(pressed).toBe("Standup");
  });
});

describe("Radio", () => {
  it("reports checked on press and reflects aria-checked", () => {
    let toggled = false;
    const { container } = ui(<Radio checked={false} onChange={() => { toggled = true; }}>Option A</Radio>);
    expect(container.querySelector("[aria-checked]")?.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByText("Option A"));
    expect(toggled).toBe(true);
  });

  it("renders the built-in title and description without hand-composed layout", () => {
    ui(<Radio checked description="For growing teams that need more control.">Pro</Radio>);
    expect(screen.getByText("Pro")).not.toBeNull();
    expect(screen.getByText("For growing teams that need more control.")).not.toBeNull();
  });
});

describe("RadioGroup", () => {
  it("selects on press and moves the single selection to the pressed option", () => {
    let picked: string | number | undefined;
    const { container } = ui(
      <RadioGroup defaultValue="pro" onChange={(v) => { picked = v; }}>
        <Radio value="hobby" description="For personal projects.">Hobby</Radio>
        <Radio value="pro" description="For growing teams.">Pro</Radio>
        <Radio value="enterprise" description="Advanced security.">Enterprise</Radio>
      </RadioGroup>,
    );
    // Exactly one option is chosen out of the box (defaultValue).
    const checked = Array.from(container.querySelectorAll('[aria-checked="true"]'));
    expect(checked.length).toBe(1);
    // Pressing another option moves the selection to it.
    fireEvent.click(screen.getByText("Enterprise"));
    expect(picked).toBe("enterprise");
    expect(container.querySelectorAll('[aria-checked="true"]').length).toBe(1);
  });

  it("renders its label as the group heading and names the radiogroup with it", () => {
    const { container } = ui(
      <RadioGroup label="Plan" description="Pick the tier that fits." defaultValue="pro">
        <Radio value="hobby">Hobby</Radio>
        <Radio value="pro">Pro</Radio>
      </RadioGroup>,
    );
    // The visible heading and supporting line render above the options.
    expect(screen.getByText("Plan")).toBeTruthy();
    expect(screen.getByText("Pick the tier that fits.")).toBeTruthy();
    // The radiogroup node itself takes the label as its accessible name (the
    // aria-label alias is what RNW forwards to the DOM).
    const group = container.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(group.getAttribute("aria-label")).toBe("Plan");
  });
});

describe("ButtonGroup", () => {
  it("marks the active segment and reports the pressed index", () => {
    let idx = -1;
    const { container } = ui(<ButtonGroup items={["Day", "Week", "Month"]} active={0} onSelect={(i) => { idx = i; }} />);
    const selected = Array.from(container.querySelectorAll("[aria-selected]")).map((e) => e.getAttribute("aria-selected"));
    expect(selected.filter((s) => s === "true").length).toBe(1);
    fireEvent.click(screen.getByText("Month"));
    expect(idx).toBe(2);
  });

  it("block stretches the segmented group and flexes segments to equal shares", () => {
    const { container } = ui(<ButtonGroup segmented defaultActive={0} items={["Day", "Week", "Month"]} block />);
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    expect(list.style.width).toBe("100%");
    const tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLElement[];
    expect(tabs.length).toBe(3);
    for (const tab of tabs) {
      expect(tab.parentElement!.parentElement).toBe(list);
      expect(tab.parentElement!.style.flexGrow).toBe("1");
    }
  });

  it("stays self-sized without block", () => {
    const { container } = ui(<ButtonGroup segmented defaultActive={0} items={["Day", "Week", "Month"]} />);
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    expect(list.style.width).toBe("");
    const tab = container.querySelector('[role="tab"]') as HTMLElement;
    expect(tab.parentElement!.style.flexGrow).toBe("");
  });

  it("iconsOnly segments hide the label, take it as the accessible name, and report it on select", () => {
    let picked = "";
    ui(
      <ButtonGroup
        segmented
        small
        iconsOnly
        accessibilityLabel="Preview form factor"
        defaultActive={2}
        items={[
          { label: "Phone width", icon: "smartphone" },
          { label: "Tablet width", icon: "tablet" },
          { label: "Desktop width", icon: "monitor" },
        ]}
        onSelect={(_i, item) => { picked = item; }}
      />,
    );
    // No visible label text; the segment is named by the item label instead,
    // and the tablist itself carries the group's accessible name.
    expect(screen.queryByText("Phone width")).toBeNull();
    const list = document.querySelector('[role="tablist"]') as HTMLElement;
    expect(list.getAttribute("aria-label")).toBe("Preview form factor");
    const phone = screen.getByLabelText("Phone width");
    expect(phone.getAttribute("aria-selected")).toBe("false");
    fireEvent.click(phone);
    expect(picked).toBe("Phone width");
    expect(phone.getAttribute("aria-selected")).toBe("true");
  });

  it("labeled icon items keep their visible label; string items keep working", () => {
    // The glyph itself is untestable here (react-native-svg is stubbed to
    // fragments; see test/setup.ts); the visual pass covers it.
    let picked = "";
    ui(
      <ButtonGroup
        segmented
        defaultActive={0}
        items={[{ label: "Day", icon: "calendar" }, "Week"]}
        onSelect={(_i, item) => { picked = item; }}
      />,
    );
    expect(screen.getByText("Day")).toBeTruthy();
    fireEvent.click(screen.getByText("Week"));
    expect(picked).toBe("Week");
  });

  it("block flexes spaced peers through their outermost RippleClip wrapper", () => {
    const { container } = ui(<ButtonGroup spaced items={["Edit", "Duplicate", "Archive"]} block />);
    const buttons = Array.from(container.querySelectorAll('[role="button"]')) as HTMLElement[];
    expect(buttons.length).toBe(3);
    for (const b of buttons) {
      // The equal-share flex rides the RippleClip wrapper (the outermost node);
      // a flex on the Pressable inside that column wrapper would flex it
      // vertically instead of sharing the row.
      expect((b.parentElement as HTMLElement).style.flexGrow).toBe("1");
      expect(b.style.flexGrow).toBe("");
    }
    const row = buttons[0].parentElement?.parentElement as HTMLElement;
    expect(row.style.width).toBe("100%");
  });

  it("split and stepper ignore block with a dev-only warning", () => {
    // The dedup cache is process-wide; clear it so a run order that fired these
    // messages earlier cannot swallow the assertions.
    resetDevWarnings();
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    try {
      ui(<ButtonGroup stepper items={["Yesterday", "Today", "Tomorrow"]} block />);
      ui(<ButtonGroup split items={["Save"]} menu={["Save a copy"]} block />);
      const warnings = warnSpy.mock.calls.map((c) => String(c[0])).filter((m) => m.includes("<ButtonGroup />"));
      expect(warnings.some((m) => m.includes("stepper"))).toBe(true);
      expect(warnings.some((m) => m.includes("split"))).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("Listbox", () => {
  it("marks the selected item and reports the pressed index", () => {
    let sel = -1;
    const { container } = ui(
      <Listbox items={[{ label: "One", selected: true }, { label: "Two" }]} onSelect={(i) => { sel = i; }} />,
    );
    expect(container.querySelector('[aria-selected="true"]')).not.toBeNull();
    fireEvent.click(screen.getByText("Two"));
    expect(sel).toBe(1);
  });
});

describe("DataTable", () => {
  it("renders headers and cells and reports the pressed row", () => {
    let pressed = -1;
    ui(
      <DataTable
        columns={["Name", "Role"]}
        rows={[["Ada", "Eng"], ["Bob", "PM"]]}
        onRowPress={(_row, i) => { pressed = i; }}
      />,
    );
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Ada")).toBeDefined();
    fireEvent.click(screen.getByText("Bob"));
    expect(pressed).toBe(1);
  });
});
