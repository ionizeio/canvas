import { BackdropBody } from "../../../../../examples/starter/smoke/fixtures/backdrop";
import { Page, PageHeader } from "../../../ui/page";

export default function BackdropFixture() {
  return (
    <Page>
      <PageHeader title="Backdrop engine checks" description="A production-shaped sky on the engine's own surface: park and resume the clock, step the energy, and sample the frame trace, the inline style writes per second and the live CSS animations." />
      <BackdropBody />
    </Page>
  );
}
