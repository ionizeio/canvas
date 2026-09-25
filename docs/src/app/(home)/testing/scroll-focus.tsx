import { useState } from "react";
import { Button, Card, Carousel, CodeBlock, Column, DataTable, Heatmap, Typography } from "@ionizeio/canvas";
import { Page } from "../../../ui/page";

const LONG = 'const destinations = ["Montréal", "Toronto", "Vancouver", "Halifax", "Victoria", "Québec", "Winnipeg", "Calgary", "Ottawa", "Edmonton"];';
const SHORT = "const ready = true;";
const columns = ["Name", "Location", "Status", "Joined", "Team"];
const slides = [{ key: "one", content: "Slide 1" }, { key: "two", content: "Slide 2" }, { key: "three", content: "Slide 3" }];
const rows = [["Ada", "Montréal", "Active", "2026-01-02", "Design"], ["Sam", "Toronto", "Active", "2026-03-04", "Engineering"]];
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
          <Typography h2>Calendar heatmap</Typography>
          <Button outline testID="before-heatmap">Before calendar heatmap</Button>
          <Heatmap testID="scroll-heatmap" calendar label="Contribution activity" values={days} />
        </Column>
        <Column snug>
          <Typography h2>Carousel</Typography>
          <Button outline testID="before-carousel">Before carousel</Button>
          <Carousel testID="scroll-carousel" items={slides} />
        </Column>
      </Column>
    </Page>
  );
}
