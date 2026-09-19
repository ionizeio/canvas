import { createContext, useContext } from "react";

// The surface's own box, published to the scene.
//
// A Backdrop lays its particle and gradient layers out against the box the surface
// actually occupies (backdrop-host.tsx measures it), not the window: a backdrop may fill
// a card, a documentation stage or a harness column as readily as the screen. A
// `Backdrop.Custom` layer draws itself, so it needs the same box to size and place its
// art; before this context it could only read the window, which put a scene's bespoke
// pieces off the visible area whenever the surface was smaller than the screen.

export interface BackdropBox {
  /** The surface's width and height in px, as laid out. */
  width: number;
  height: number;
  /** The scene's vanishing point in 0..1 units of the box. */
  focus: { x: number; y: number };
}

export const BackdropBoxContext = createContext<BackdropBox | null>(null);

/** The box of the nearest Backdrop surface, for a `Backdrop.Custom` layer's own layout.
 *  Null outside a surface (the layer is being rendered somewhere other than a Backdrop),
 *  in which case a scene falls back to whatever bounds it has. */
export function useBackdropBox(): BackdropBox | null {
  return useContext(BackdropBoxContext);
}
