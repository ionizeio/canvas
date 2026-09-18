import { Slot } from "expo-router";
import { ClientOnly } from "../../../ui/client-only";

// The runtime fixtures are client-rendered: the export writes their shell but not
// their bodies (see ClientOnly), so a query-driven scenario or a live pixel ratio
// can never disagree with what the server sent.
export default function TestingLayout() {
  return (
    <ClientOnly>
      <Slot />
    </ClientOnly>
  );
}
