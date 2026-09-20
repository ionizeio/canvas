import { useLocalSearchParams } from "expo-router";
import type { Energy } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../../ui/page";
import { CurrentsHarness } from "../../../ui/testing/currents-harness";

// Query parameters let a tuning run start in a specific scheme, energy, or still state.
export default function CurrentsFixture() {
  const params = useLocalSearchParams<{ scheme?: string; energy?: string; still?: string }>();
  const energy = params.energy === "calm" || params.energy === "energetic" || params.energy === "default" ? (params.energy as Energy) : undefined;
  return (
    <Page viewportOverlays>
      <PageHeader title="Spectral currents checks" description="The docs' flowing background on its backdrop surface. Park and resume the scene, compare energy and color scheme, and sample frame timing and animation activity." />
      <CurrentsHarness initialDark={params.scheme !== "light"} initialEnergy={energy} initialStill={params.still === "1"} />
    </Page>
  );
}
