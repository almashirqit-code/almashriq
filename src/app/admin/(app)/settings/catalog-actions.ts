"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import type { CatalogKind } from "@/lib/catalog";

type Result = { error?: string; ok?: boolean; added?: number; skipped?: number; id?: string };

const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
const refresh = () => revalidatePath("/admin", "layout");
const dup = (e: { code?: string; message: string }) => (e.code === "23505" ? "That name is already in the list." : e.message);

export async function addMake(kind: CatalogKind, name: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const n = clean(name);
  if (!n) return { error: "Enter a make." };
  if (kind !== "vehicle" && kind !== "machinery") return { error: "Unknown list." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("catalog_makes").insert({ kind, name: n }).select("id").single();
  if (error) return { error: dup(error) };
  refresh();
  return { ok: true, id: data.id as string };
}

export async function updateMake(id: string, patch: { name?: string; active?: boolean }): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = clean(patch.name);
    if (!n) return { error: "Enter a make." };
    row.name = n;
  }
  if (patch.active !== undefined) row.active = !!patch.active;
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_makes").update(row).eq("id", id);
  if (error) return { error: dup(error) };
  refresh();
  return { ok: true };
}

/** Removes the make and its models from the list. Vehicles, parts and machines already saved keep their text. */
export async function deleteMake(id: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_makes").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

/** Adds several models at once (one per line, or comma-separated); names already in the list are skipped. */
export async function addModels(makeId: string, text: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const names = [...new Map(String(text ?? "").split(/\r?\n|,|;|\t/).map(clean).filter(Boolean).map((n) => [n.toLowerCase(), n])).values()];
  if (!names.length) return { error: "Enter at least one model." };
  if (names.length > 500) return { error: "Add up to 500 models at a time." };
  const supabase = await createClient();
  const { data: existing, error: e0 } = await supabase.from("catalog_models").select("name").eq("make_id", makeId).limit(5000);
  if (e0) return { error: e0.message };
  const have = new Set((existing ?? []).map((m) => String(m.name).toLowerCase()));
  const fresh = names.filter((n) => !have.has(n.toLowerCase()));
  if (fresh.length) {
    const { error } = await supabase.from("catalog_models").insert(fresh.map((name) => ({ make_id: makeId, name })));
    if (error) return { error: dup(error) };
  }
  refresh();
  return { ok: true, added: fresh.length, skipped: names.length - fresh.length };
}

export async function updateModel(id: string, patch: { name?: string; model_code?: string | null; active?: boolean }): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = clean(patch.name);
    if (!n) return { error: "Enter a model." };
    row.name = n;
  }
  if (patch.model_code !== undefined) row.model_code = clean(patch.model_code) || null;
  if (patch.active !== undefined) row.active = !!patch.active;
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_models").update(row).eq("id", id);
  if (error) return { error: dup(error) };
  refresh();
  return { ok: true };
}

export async function deleteModel(id: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_models").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
