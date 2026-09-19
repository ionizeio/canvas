import { useLocalSearchParams } from "expo-router";
import { PopupBody } from "../../../../../examples/starter/smoke/fixtures/popup";
import { Page, PageHeader } from "../../../ui/page";

// The liquid popup harness. `?mode=glass&scheme=dark` starts it in the material
// and scheme a run wants to read instead of driving both switches first.
export default function PopupFixture() {
  const { mode, scheme } = useLocalSearchParams<{ mode?: string; scheme?: string }>();
  return (
    <Page>
      <PageHeader title="Liquid popup checks" description="The Autocomplete suggestion list and the Dropdown menu under the popup policy: open, close, reopen mid-exit and cycle drivers, material and scheme switches, and a frame readout." />
      <PopupBody key={`${mode ?? "solid"}-${scheme ?? "light"}`} glass={mode === "glass"} dark={scheme === "dark"} />
    </Page>
  );
}
