/**
 * Complete units: cars bought to be dismantled for parts (vehicles.for_parts).
 * They are listed under Parts → Complete units on the website (not in the car stock list), with
 * their condition and the cuts / parts we can supply from them.
 */

export const UNIT_CONDITIONS = ["running", "non_running", "engine_ok", "accident", "flood", "fire"] as const;
export type UnitCondition = (typeof UNIT_CONDITIONS)[number];
export const UNIT_CONDITION_LABEL: Record<UnitCondition, string> = {
  running: "Running",
  non_running: "Non-running",
  engine_ok: "Engine & gearbox OK",
  accident: "Accident damaged",
  flood: "Flood damaged",
  fire: "Fire damaged",
};

/** What a unit can be sold as once dismantled: cuts first, then major parts. */
export const UNIT_PARTS = [
  "half_cut",
  "nose_cut",
  "rear_cut",
  "engine",
  "gearbox",
  "battery",
  "doors",
  "bumpers",
  "lights",
  "interior",
  "wheels",
  "suspension",
] as const;
export type UnitPart = (typeof UNIT_PARTS)[number];
export const UNIT_PART_LABEL: Record<UnitPart, string> = {
  half_cut: "Half cut",
  nose_cut: "Nose cut",
  rear_cut: "Rear cut",
  engine: "Engine",
  gearbox: "Gearbox",
  battery: "Battery",
  doors: "Doors",
  bumpers: "Bumpers",
  lights: "Lights",
  interior: "Interior & seats",
  wheels: "Wheels & tyres",
  suspension: "Suspension & axles",
};
/** The three cut types, highlighted on cards. */
export const UNIT_CUTS: UnitPart[] = ["half_cut", "nose_cut", "rear_cut"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const PART_ALIASES: Record<string, UnitPart> = Object.fromEntries([
  ...UNIT_PARTS.map((p) => [norm(p), p]),
  ...UNIT_PARTS.map((p) => [norm(UNIT_PART_LABEL[p]), p]),
  ["halfcut", "half_cut"],
  ["nosecut", "nose_cut"],
  ["frontcut", "nose_cut"],
  ["rearcut", "rear_cut"],
  ["backcut", "rear_cut"],
  ["engines", "engine"],
  ["transmission", "gearbox"],
  ["batteries", "battery"],
  ["door", "doors"],
  ["bumper", "bumpers"],
  ["light", "lights"],
  ["seats", "interior"],
  ["wheel", "wheels"],
  ["tyres", "wheels"],
  ["tires", "wheels"],
]) as Record<string, UnitPart>;

/** "Half cut, engine; DOORS" → ["half_cut", "engine", "doors"] (unknown names are dropped). */
export function parseUnitParts(v: unknown): UnitPart[] {
  const list = Array.isArray(v) ? v.map(String) : String(v ?? "").split(/[,;|/]+/);
  const out = new Set<UnitPart>();
  for (const s of list) {
    const p = PART_ALIASES[norm(s)];
    if (p) out.add(p);
  }
  return UNIT_PARTS.filter((p) => out.has(p));
}

export function parseUnitCondition(v: unknown): UnitCondition | null {
  const k = norm(String(v ?? ""));
  if (!k) return null;
  return UNIT_CONDITIONS.find((c) => norm(c) === k || norm(UNIT_CONDITION_LABEL[c]) === k) ?? (k === "nonrunner" ? "non_running" : k === "runner" ? "running" : null);
}
