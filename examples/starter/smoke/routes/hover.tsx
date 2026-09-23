import { Screen } from "../../app-frame/screen";
import { HoverBody } from "../../testing/hover";

// Hover exists on the web only (React Native delivers no pointer hover on iOS or Android
// by default); on a device this route shows the same controls at rest.
export default function HoverRoute() {
  return <Screen><HoverBody /></Screen>;
}
