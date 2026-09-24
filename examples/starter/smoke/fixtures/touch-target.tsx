import { useState, type ReactNode } from "react";
import {
  Alert, Board, Button, Card, Chip, CodeBlock, Column, Icon, Input, Pagination, Row, RowMenu, StackedList,
  Stepper, Steps, ThemeProvider, Toast, Typography, useTheme,
} from "@nannier-com/canvas";

// The touch-target harness: the kit's controls that are smaller than the platform minimum
// (44pt iOS, 48dp Android) and reach it through hitSlop, each with a press counter, so a tap
// just outside a control's visible box can be checked on a device. Coordinates come from the
// platform's own tree (uiautomator bounds on Android, the accessibility frames on iOS).
//
//   Clipped controls: the controls whose Android ripple is clipped to their rounded shape
//     (RippleClip), in a padded Card so nothing else is near them.
//   Other clips: the other kit views that clip a slop-bearing control (the Android Chip
//     pill, the grouped Input box of the 36pt iOS small field) and the rest of the
//     RippleClip sites (Stepper, tappable Chip, StackedList row menu).
//   Seams: two controls of one component side by side or stacked, where the component
//     splits the gap between their touch areas so neither takes a tap inside the other
//     (the Board card's drag handle and menu trigger among them).
//   Neighbors: two components the caller placed a gap apart. React Native gives a point both
//     touch areas cover to the later sibling, and the kit does not split this seam; the card
//     shows what happens, for the owner's decision.

type Tally = Record<string, number>;

// One readout line under each group, so a group's counters are on screen with it.
function Counts({ ids, counts }: { ids: string[]; counts: Tally }) {
  return <Typography small muted testID={`tt-count-${ids[0]}`}>{ids.map((id) => `${id} ${counts[id] ?? 0}`).join(", ")}</Typography>;
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Column snug>
      <Typography h4>{title}</Typography>
      {note != null ? <Typography small muted>{note}</Typography> : null}
      <Card>
        <Column relaxed>{children}</Column>
      </Card>
    </Column>
  );
}

const STEPS = [{ label: "Cart" }, { label: "Ship" }, { label: "Pay" }];
const MENU = [{ label: "Edit" }, { label: "Delete" }];
const PEOPLE = [{ name: "Ada Lovelace", detail: "Owner" }, { name: "Lin Hua", detail: "Viewer" }];
const LANES = [{ id: "todo", label: "To do" }];
const CARDS = [{ id: "brief", columnId: "todo", title: "Write the brief", menu: MENU }];

export function TouchTargetBody() {
  // The page's own scheme to start with, so the headings read on it; the switch flips it.
  const page = useTheme();
  const [glass, setGlass] = useState(false);
  const [dark, setDark] = useState(page.dark);
  const [counts, setCounts] = useState<Tally>({});
  const [step, setStep] = useState(1);
  const [railStep, setRailStep] = useState(1);
  const [current, setCurrent] = useState(3);
  const [quantity, setQuantity] = useState(1);
  const [small, setSmall] = useState(1);
  const [text, setText] = useState("Clear me");
  const [secret, setSecret] = useState("hunter22");
  const bump = (id: string) => setCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  const opened = (id: string) => (open: boolean) => { if (open) bump(id); };

  return (
    <ThemeProvider glass={glass} solid={!glass} dark={dark} light={!dark}>
      <Column relaxed>
        <Typography h3>Touch targets</Typography>
        <Typography testID="tt-mode">{`Mode: ${glass ? "glass" : "solid"}; scheme: ${dark ? "dark" : "light"}`}</Typography>
        <Row snug wrap>
          <Button onPress={() => setGlass((value) => !value)} testID="tt-material-toggle">Switch material</Button>
          <Button onPress={() => setDark((value) => !value)} testID="tt-scheme-toggle">Switch scheme</Button>
        </Row>

        <Section title="Clipped controls">
          <Row relaxed wrap>
            <Button small onPress={() => bump("button-small")} testID="tt-button-small">Small</Button>
            <Button onPress={() => bump("button-base")} testID="tt-button-base">Base</Button>
          </Row>
          <Counts ids={["button-small", "button-base"]} counts={counts} />
          <Steps steps={STEPS} current={step} onStepPress={(index) => { setStep(index); bump("steps"); }} />
          <Counts ids={["steps"]} counts={counts} />
          <RowMenu items={MENU} triggerLabel="Row actions" onOpenChange={opened("row-menu")} />
          <Counts ids={["row-menu"]} counts={counts} />
          <Pagination total={5} page={current} onChange={(next) => { setCurrent(next); bump("pagination"); }} />
          <Pagination withSize small total={5} page={current} onChange={(next) => { setCurrent(next); bump("pager-size"); }} onPageSizeChange={() => bump("rows-per-page")} />
          <Counts ids={["pagination", "pager-size", "rows-per-page"]} counts={counts} />
          <CodeBlock copy code="bun add @ionizeio/canvas" onCopy={() => bump("copy-floating")} />
          <CodeBlock copy filename="install.sh" code="bun add @ionizeio/canvas" onCopy={() => bump("copy-header")} />
          <Counts ids={["copy-floating", "copy-header"]} counts={counts} />
        </Section>

        <Section title="Other clips">
          <Row relaxed wrap>
            <Chip onPress={() => bump("chip")}>Tappable</Chip>
            <Chip onRemove={() => bump("chip-remove")}>Removable</Chip>
          </Row>
          <Counts ids={["chip", "chip-remove"]} counts={counts} />
          <Stepper value={quantity} min={0} max={9} onChange={(next) => { setQuantity(next); bump("stepper"); }} />
          <Counts ids={["stepper"]} counts={counts} />
          <StackedList rowMenu items={PEOPLE} onPressItemMenu={(index) => bump(`list-menu-${index}`)} />
          <Counts ids={["list-menu-0", "list-menu-1"]} counts={counts} />
          <Input small clearable value={text} onChangeText={(next) => { setText(next); if (next === "") { bump("input-clear"); setTimeout(() => setText("Clear me"), 300); } }} accessibilityLabel="Clearable field" />
          <Counts ids={["input-clear"]} counts={counts} />
        </Section>

        <Section title="Seams">
          <Toast message="Draft saved" action={{ label: "Undo", onPress: () => bump("toast-action") }} onDismiss={() => bump("toast-dismiss")} />
          <Counts ids={["toast-action", "toast-dismiss"]} counts={counts} />
          <Stepper small value={small} min={0} max={9} onChange={(next) => { setSmall(next); bump("stepper-small"); }} />
          <Counts ids={["stepper-small"]} counts={counts} />
          <Chip onPress={() => bump("chip-body")} onRemove={() => bump("chip-both-remove")}>Both</Chip>
          <Counts ids={["chip-body", "chip-both-remove"]} counts={counts} />
          <Input small clearable secureTextEntry passwordToggle value={secret} onChangeText={(next) => { setSecret(next); if (next === "") { bump("secret-clear"); setTimeout(() => setSecret("hunter22"), 300); } }} accessibilityLabel="Secret field" />
          <Counts ids={["secret-clear"]} counts={counts} />
          <Alert
            title="Heads up"
            description="Two actions and a dismiss."
            dismissible
            dismissed={false}
            onDismiss={() => bump("alert-dismiss")}
            actions={<>
              <Button small onPress={() => bump("alert-keep")}>Keep</Button>
              <Button small onPress={() => bump("alert-retry")}>Retry</Button>
            </>}
          />
          <Counts ids={["alert-keep", "alert-retry", "alert-dismiss"]} counts={counts} />
          <Steps vertical steps={STEPS} current={railStep} onStepPress={(index) => { setRailStep(index); bump(`rail-${index}`); }} />
          <Counts ids={["rail-0", "rail-1", "rail-2"]} counts={counts} />
          <Board columns={LANES} defaultItems={CARDS} onSelectItemMenu={() => bump("board-menu")} />
          <Counts ids={["board-menu"]} counts={counts} />
        </Section>

        <Section
          title="Neighbors"
          note="Controls the caller places a gap apart. Where two touch areas overlap, React Native gives the tap to the later one, so the second control takes the taps in the gap, and inside the first control's edge where the gap is narrower than the two touch areas: the small icon Buttons on Android, the chips on iOS (Android chips reach nothing sideways). The kit does not split this seam."
        >
          <Row snug>
            <Button small icon accessibilityLabel="Neighbor A" iconLeft={<Icon plus size={16} />} onPress={() => bump("neighbor-a")} />
            <Button small icon accessibilityLabel="Neighbor B" iconLeft={<Icon minus size={16} />} onPress={() => bump("neighbor-b")} />
          </Row>
          <Counts ids={["neighbor-a", "neighbor-b"]} counts={counts} />
          <Row snug>
            <Chip onPress={() => bump("neighbor-chip-a")} accessibilityLabel="Chip A">Design</Chip>
            <Chip onPress={() => bump("neighbor-chip-b")} accessibilityLabel="Chip B">Engineering</Chip>
          </Row>
          <Counts ids={["neighbor-chip-a", "neighbor-chip-b"]} counts={counts} />
        </Section>
      </Column>
    </ThemeProvider>
  );
}
