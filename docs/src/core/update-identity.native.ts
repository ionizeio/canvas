import * as Updates from "expo-updates";
import type { UpdateIdentity } from "./update-identity";

// The native build's update identity (see update-identity.ts for why the web build reads
// none, and why expo-updates must stay out of the web bundles).

/** The running update's id and launch source, from expo-updates. */
export function readUpdateIdentity(): UpdateIdentity {
  return { updateId: Updates.updateId ?? null, isEmbeddedLaunch: Updates.isEmbeddedLaunch };
}
