/**
 * Room status icons, gathered in one place so the board and its legend cannot
 * pick different ones.
 *
 * Only the mop is hand-drawn. lucide-react does ship TrafficCone (as well as
 * DoorOpen and DoorClosed), so the real icon is used rather than a redrawn
 * copy — it matches the rest of the set better than anything hand-made would.
 */
import { DoorOpen, DoorClosed, TrafficCone } from "lucide-react";
import Mop from "./Mop";

export { Mop, DoorOpen, DoorClosed, TrafficCone };

/** One icon per room status. STATUS_META in lib/constants.js holds the words. */
export const STATUS_ICON = {
  available:   DoorOpen,
  occupied:    DoorClosed,
  dirty:       Mop,
  cleaning:    Mop,
  maintenance: TrafficCone,
};
