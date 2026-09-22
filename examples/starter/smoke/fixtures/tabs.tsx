import { useState } from "react";
import { Column, Tabs, Typography } from "@nannier-com/canvas";

const tabs = [{ label: "Overview" }, { label: "Activity" }, { label: "Unavailable", disabled: true }];

export function TabsBody({ disabled = false }: { disabled?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [changes, setChanges] = useState(0);
  return (
    <Column relaxed>
      <Tabs tabs={tabs} defaultActive={0} disabled={disabled} testID="workspace-tabs"
        onSelect={(index) => {
          setSelected(index);
          setChanges((count) => count + 1);
        }} />
      <Typography testID="tabs-selection">Selected tab: {tabs[selected]?.label ?? "Unknown"}</Typography>
      <Typography small muted testID="tabs-change-count">Changes: {changes}</Typography>
    </Column>
  );
}
