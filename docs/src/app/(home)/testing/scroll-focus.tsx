import { useState } from "react";
import { Button, Card, Carousel, CodeBlock, Column, DataTable, Feed, GridList, Heatmap, Select, StackedList, Typography } from "@ionizeio/canvas";
import { Page } from "../../../ui/page";

const LONG = 'const destinations = ["Montréal", "Toronto", "Vancouver", "Halifax", "Victoria", "Québec", "Winnipeg", "Calgary", "Ottawa", "Edmonton"];';
const SHORT = "const ready = true;";
const columns = ["Name", "Location", "Status", "Joined", "Team"];
// More cities than the option card's cap holds, so its list scrolls.
const cities = ["Calgary", "Charlottetown", "Edmonton", "Fredericton", "Halifax", "Iqaluit", "Montréal", "Ottawa", "Québec", "Regina", "Saskatoon", "St. John's", "Toronto", "Vancouver", "Victoria", "Whitehorse", "Winnipeg", "Yellowknife"];
const slides = [{ key: "one", content: "Slide 1" }, { key: "two", content: "Slide 2" }, { key: "three", content: "Slide 3" }];
const rows = [["Ada", "Montréal", "Active", "2026-01-02", "Design"], ["Sam", "Toronto", "Active", "2026-03-04", "Engineering"]];
// More rows than the windowed table's bounded height shows, none of them focusable, so
// its body scrolls with nothing inside it to take a Tab.
const people = ["Ada", "Sam", "Lee", "Kim", "Noor", "Ravi", "Iris", "Theo"];
const manyRows = Array.from({ length: 40 }, (_, i) => [
  `${people[i % people.length]} ${i + 1}`,
  cities[i % cities.length]!,
  i % 5 === 0 ? "Invited" : "Active",
  `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  i % 2 === 0 ? "Design" : "Engineering",
]);
// Two hundred read-only rows, events and tiles for the windowed lists: more than their
// bounded heights show, none of them focusable, so each list scrolls with nothing inside
// it to take a Tab, and more than a list's window mounts, so some rows are always
// unmounted and each list's count comes from its rows' aria-setsize. Each list is named
// (the card by its title, the rest by `label`), since the windowed list is the stop.
const WINDOWED_ROWS = 200;
const listPeople = Array.from({ length: WINDOWED_ROWS }, (_, i) => ({
  id: i,
  name: `${people[i % people.length]} ${i + 1}`,
  detail: cities[i % cities.length]!,
  meta: i % 5 === 0 ? "Invited" : "Active",
}));
const events = Array.from({ length: WINDOWED_ROWS }, (_, i) => ({
  id: i,
  actor: `${people[i % people.length]} ${i + 1}`,
  action: i % 2 === 0 ? "updated the roster" : "joined the team",
  time: `${i + 1} hours ago`,
}));
const tileColors = ["primary", "blue-500", "green-500", "amber-500"];
const tiles = Array.from({ length: WINDOWED_ROWS }, (_, i) => ({
  title: `IMG_${String(1000 + i)}.jpg`,
  subtitle: `${(i % 9) + 1}.2 MB`,
  color: tileColors[i % tileColors.length],
}));
// A year of days (53 whole weeks) with a count on every third one, so the grid is 773 px
// wide: wider than a phone's page, narrower than a desktop's.
const days = Array.from({ length: 371 }, (_, i) => ({
  value: i % 3 === 0 ? ((i % 4) + 1) / 4 : 0,
  count: i % 3 === 0 ? (i % 4) + 1 : 0,
  date: new Date(Date.UTC(2025, 8, 21 + i)).toISOString().slice(0, 10),
}));

// Hidden from navigation. Real kit scrollports share the same native measurement
// and focus props on this route, including in the installed native docs app.
export default function ScrollFocusFixture() {
  const [long, setLong] = useState(true);
  return (
    <Page>
      <Column tight>
        <Typography h1>Scrollable content</Typography>
        <Typography muted>Tab to overflowing content and use the arrow keys to read the rest.</Typography>
      </Column>
      <Column relaxed>
        <Button onPress={() => setLong((value) => !value)}>{long ? "Use short content" : "Use long content"}</Button>
        <Column snug>
          <Typography h2>Plain code</Typography>
          <Button outline testID="before-plain">Before plain code</Button>
          <CodeBlock testID="scroll-plain" code={long ? LONG : SHORT} />
          <Button outline testID="after-plain">After plain code</Button>
        </Column>
        <Column snug>
          <Typography h2>Numbered code</Typography>
          <Button outline testID="before-numbered">Before numbered code</Button>
          <CodeBlock testID="scroll-numbered" numbered code={long ? LONG : SHORT} />
        </Column>
        <Column snug>
          <Typography h2>Terminal</Typography>
          <Button outline testID="before-terminal">Before terminal code</Button>
          <CodeBlock testID="scroll-terminal" terminal code={long ? LONG : SHORT} />
        </Column>
        <Column snug>
          <Typography h2>Wrapping and inline code</Typography>
          <CodeBlock testID="scroll-wrap" wrap code={LONG} />
          <CodeBlock testID="scroll-inline" inline code={SHORT} />
        </Column>
        <Column snug>
          <Typography h2>Data table</Typography>
          <Button outline testID="before-table">Before data table</Button>
          <DataTable testID="scroll-table" columns={columns} rows={rows} />
        </Column>
        <Column snug>
          <Typography h2>Attached data table</Typography>
          <Button outline testID="before-attached">Before attached data table</Button>
          {/* The DataTable page's attached example: flush inside a card that clips it. */}
          <Card flat flush style={{ overflow: "hidden" }}>
            <DataTable testID="scroll-attached" attached columns={columns} rows={rows} />
          </Card>
        </Column>
        <Column snug>
          <Typography h2>Windowed data table</Typography>
          <Button outline testID="before-windowed">Before windowed data table</Button>
          <DataTable testID="scroll-windowed" virtualized columns={columns} rows={manyRows} style={{ maxHeight: 240 }} />
          <Button outline testID="after-windowed">After windowed data table</Button>
        </Column>
        <Column snug>
          <Typography h2>Windowed stacked list</Typography>
          <Button outline testID="before-stacked">Before windowed stacked list</Button>
          <StackedList testID="scroll-stacked" card title="Team" virtualized items={listPeople} style={{ maxHeight: 240 }} />
          <Button outline testID="after-stacked">After windowed stacked list</Button>
        </Column>
        <Column snug>
          <Typography h2>Windowed plain stacked list</Typography>
          <Button outline testID="before-stacked-plain">Before windowed plain stacked list</Button>
          <StackedList testID="scroll-stacked-plain" label="People" virtualized items={listPeople} style={{ maxHeight: 240 }} />
          <Button outline testID="after-stacked-plain">After windowed plain stacked list</Button>
        </Column>
        <Column snug>
          <Typography h2>Windowed feed</Typography>
          <Button outline testID="before-feed">Before windowed feed</Button>
          <Feed testID="scroll-feed" label="Roster activity" virtualized items={events} style={{ maxHeight: 240 }} />
          <Button outline testID="after-feed">After windowed feed</Button>
        </Column>
        <Column snug>
          <Typography h2>Windowed avatar feed</Typography>
          <Button outline testID="before-feed-avatar">Before windowed avatar feed</Button>
          <Feed testID="scroll-feed-avatar" label="Roster activity by person" avatar virtualized items={events} style={{ maxHeight: 240 }} />
          <Button outline testID="after-feed-avatar">After windowed avatar feed</Button>
        </Column>
        <Column snug>
          <Typography h2>Windowed grid list</Typography>
          <Button outline testID="before-grid">Before windowed grid list</Button>
          <GridList testID="scroll-grid" label="Photos" gallery cols3 virtualized items={tiles} style={{ maxHeight: 240 }} />
          <Button outline testID="after-grid">After windowed grid list</Button>
        </Column>
        <Column snug>
          <Typography h2>Calendar heatmap</Typography>
          <Button outline testID="before-heatmap">Before calendar heatmap</Button>
          <Heatmap testID="scroll-heatmap" calendar label="Contribution activity" values={days} />
        </Column>
        <Column snug>
          <Typography h2>Carousel</Typography>
          <Button outline testID="before-carousel">Before carousel</Button>
          <Carousel testID="scroll-carousel" items={slides} />
        </Column>
        <Column snug>
          <Typography h2>Option list</Typography>
          <Select testID="scroll-options" label="City" defaultValue="Toronto" options={cities} />
        </Column>
      </Column>
    </Page>
  );
}
