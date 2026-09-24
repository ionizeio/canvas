import { Screen } from "../../app-frame/screen";
import { TouchTargetBody } from "../../testing/touch-target";

// The controls under the platform minimum, each with a press counter, for taps just
// outside a control's visible box (see the fixture's header).
export default function TouchTargetRoute() {
  return <Screen><TouchTargetBody /></Screen>;
}
