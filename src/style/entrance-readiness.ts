import { createContext } from "react";

// Focus readiness only. A held ancestor must not announce ready descendants;
// each Entrance still decides its own hold from its owner's `ready`.
export const EntranceReadinessContext = createContext(true);
