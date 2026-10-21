/** Makes & models list (Configuration → Makes & models). Used as suggestions in the forms. */
export type CatalogKind = "vehicle" | "machinery";

export type CatalogModel = { id: string; name: string; model_code: string | null; active: boolean };
export type CatalogMake = { id: string; kind: CatalogKind; name: string; active: boolean; models: CatalogModel[] };

export const CATALOG_KINDS: { key: CatalogKind; label: string; help: string }[] = [
  { key: "vehicle", label: "Cars & parts", help: "Used by the vehicle and spare-part forms." },
  { key: "machinery", label: "Machinery", help: "Used by the heavy-machinery form." },
];

/** Active makes, A–Z. */
export const makeNames = (catalog: CatalogMake[]) =>
  catalog
    .filter((m) => m.active)
    .map((m) => m.name)
    .sort((a, b) => a.localeCompare(b));

/** Models of a make (matched ignoring case/spacing), A–Z. Empty when the make isn't in the list. */
export function modelNames(catalog: CatalogMake[], make: string | null | undefined) {
  const key = (make ?? "").trim().toLowerCase();
  if (!key) return [];
  const m = catalog.find((x) => x.name.trim().toLowerCase() === key);
  return (m?.models ?? [])
    .filter((x) => x.active)
    .map((x) => x.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
