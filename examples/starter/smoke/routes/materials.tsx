import { OverlayProvider } from "@nannier-com/canvas";
import { Screen } from "../../app-frame/screen";
import { MaterialsBody } from "../../testing/materials";

// The material fixture's modals center in the measured viewport. That host is a
// candidate API, so the smoke route supplies it around the ordinary frame rather
// than the frame carrying an API its registry pin does not have yet.
export default function MaterialsRoute() {
  return <OverlayProvider viewport><Screen viewportOverlays><MaterialsBody /></Screen></OverlayProvider>;
}
