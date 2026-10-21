import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CatalogKind, CatalogMake } from "./catalog";

/** Makes (with their models) for one kind; empty list if the table isn't there yet. */
export async function loadCatalog(kind: CatalogKind): Promise<CatalogMake[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_makes")
    .select("id, kind, name, active, catalog_models(id, name, model_code, active)")
    .eq("kind", kind)
    .order("name")
    .limit(2000);
  return ((data ?? []) as unknown as (Omit<CatalogMake, "models"> & { catalog_models: CatalogMake["models"] | null })[]).map(({ catalog_models, ...m }) => ({
    ...m,
    models: catalog_models ?? [],
  }));
}
