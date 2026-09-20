import { useLocalSearchParams } from "expo-router";
import { Page, PageHeader } from "../../../ui/page";
import { OrbitHarness } from "../../../ui/testing/orbit-harness";

// The hero orbit harness route: the home page's orbit with its tuning drivers.
// `?scheme=light` starts light, `?still=1` starts parked, `?stacked=1` starts on the
// phone's stacked orbit.
export default function OrbitFixture() {
  const params = useLocalSearchParams<{ scheme?: string; still?: string; stacked?: string }>();
  return (
    <Page>
      <PageHeader title="Hero orbit checks" description="The home page's orbit on the kit's loop primitive: park and resume the loops, switch between the desktop and the stacked orbit, switch the scheme, and sample the frame trace, the inline style writes per second, the live CSS animations and the React commits per second." />
      <OrbitHarness initialDark={params.scheme !== "light"} initialStill={params.still === "1"} initialStacked={params.stacked === "1"} />
    </Page>
  );
}
