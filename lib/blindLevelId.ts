import { uid } from "./id";

/** Stable id for a blind-structure row (survives reorder). */
export function newBlindLevelId(): string {
  return uid("bl");
}
