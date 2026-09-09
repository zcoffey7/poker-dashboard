/**
 * Names that show up in the app (or on a phone screenshot) which belong to an
 * existing player in the sheet. Mirrors the alias table in
 * `.cursor/skills/update-poker-standings/SKILL.md` — keep the two in sync.
 */
const ALIASES: Record<string, string> = {
  noble: "Ham",
  christophertobytobin: "Toby",
  chris: "Toby",
  me: "Coffey",
  hounsell: "Xander",
  kyle: "Martell",
};

/** Resolve a display name to the canonical name used in the standings CSVs. */
export function canonicalName(name: string): string {
  const trimmed = name.trim();
  const mapped = ALIASES[trimmed.toLowerCase().replace(/\s+/g, "")];
  return mapped ?? trimmed;
}

/** True when `canonicalName` would rewrite this name. */
export function isAlias(name: string): boolean {
  return canonicalName(name) !== name.trim();
}
