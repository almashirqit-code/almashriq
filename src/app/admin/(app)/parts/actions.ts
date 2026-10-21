"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { parsePart, type PartInput, type PartStatus } from "@/lib/parts";

function refresh() {
  revalidatePath("/admin/parts");
  revalidatePath("/parts");
}

export async function savePart(id: string | null, input: PartInput): Promise<{ error?: string; ok?: boolean }> {
  await assertRole(["admin", "manager"]);
  // Re-validate on the server with the same rules as the bulk import.
  const { data, errors } = parsePart(input);
  if (errors.length) return { error: errors.join("; ") };
  if (data.year_from && data.year_to && data.year_from > data.year_to) return { error: "Year from is after year to." };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("parts").update(data).eq("id", id) : await supabase.from("parts").insert(data);
  if (error) return { error: error.code === "23505" ? `Part no. "${data.part_no}" is already used.` : error.message };
  refresh();
  return { ok: true };
}

export async function setPartStatus(id: string, status: PartStatus) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("parts").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function togglePartWebsite(id: string, show: boolean) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("parts").update({ show_on_website: show }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deletePart(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("parts").delete().eq("id", id).select("photo_path").maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.photo_path) await supabase.storage.from("site-assets").remove([data.photo_path]);
  refresh();
}

/** Called by the bulk importer after it has upserted directly through the browser client. */
export async function partsImported() {
  await assertRole(["admin", "manager"]);
  refresh();
}
