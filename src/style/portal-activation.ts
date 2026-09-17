import { createContext } from "react";

/**
 * Internal logical-opening identity for retained portals. Owners supply a new
 * token only when an opening is accepted, and retain it through closing and
 * content/geometry updates. Null opts into the usual mount-time ordering.
 */
export const PortalActivationContext = createContext<symbol | number | null>(null);
