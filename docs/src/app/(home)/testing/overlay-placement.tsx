import { useState } from "react";
import { Autocomplete, Column, Command, Dropdown, Popover, Select, Typography } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../../ui/page";
import { Popover as IOSPopover } from "../../../../../src/atoms/popover/popover.ios";

const options = Array.from({ length: 40 }, (_, index) => `Option ${String(index + 1).padStart(2, "0")}`);

export default function OverlayPlacementFixture() {
  const [command, setCommand] = useState("None");
  return (
    <Page>
      <PageHeader title="Overlay placement" description="Long menus remain reachable near the viewport edges." />
      <Column loose testID="overlay-content-band">
        <IOSPopover trigger="Review this project's settings and sharing permissions" title="Wide-trigger details" description="The pointer follows the measured trigger and card." actionLabel="Close details" />
        {Array.from({ length: 20 }, (_, index) => <Typography key={index}>Page content {index + 1}</Typography>)}
        <Autocomplete label="Edge autocomplete" options={options} />
        <Select label="Edge select" options={options} />
        <Dropdown trigger="Edge menu" items={options.map((label) => ({ label }))} />
        <Command trigger footer testID="edge-command" placeholder="Edge commands" groups={[{ heading: "Actions", items: options.map((label) => ({ label })) }]} onSelect={(item) => setCommand(item.label)} />
        <Typography testID="command-selection">Command selection: {command}</Typography>
        <Popover trigger="Edge popover" title="Menu details" description="This panel follows its trigger and the available viewport.">
          <Column snug>{options.map((option) => <Typography key={option}>{option}</Typography>)}</Column>
        </Popover>
        {Array.from({ length: 20 }, (_, index) => <Typography key={index}>More page content {index + 1}</Typography>)}
      </Column>
    </Page>
  );
}
