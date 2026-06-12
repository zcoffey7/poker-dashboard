/** Stable id for a blind-structure row (survives reorder). */
export function newBlindLevelId(): string {
  return `bl_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}
