import { useLocalSearchParams } from "expo-router";
import type { Energy } from "@ionizeio/canvas";
import { Page, PageHeader } from "../../../ui/page";
import { LatticeHarness } from "../../../ui/testing/lattice-harness";

// The retained Lattice assembly fixture with its tuning drivers.
// `?scheme=light` starts light, `?energy=calm|energetic` overrides the scene's energy,
// `?still=1` starts parked on the poster.
export default function LatticeFixture() {
  const params = useLocalSearchParams<{ scheme?: string; energy?: string; still?: string }>();
  const energy = params.energy === "calm" || params.energy === "energetic" || params.energy === "default" ? (params.energy as Energy) : undefined;
  return (
    <Page viewportOverlays>
      <PageHeader title="Lattice scene checks" description="The assembly demonstration on the engine's own surface: park and resume the clock, step the energy, switch the scheme, jump to each assembly moment, and sample the frame trace, the inline style writes per second and the live CSS animations." />
      <LatticeHarness initialDark={params.scheme !== "light"} initialEnergy={energy} initialStill={params.still === "1"} />
    </Page>
  );
}
