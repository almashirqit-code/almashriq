"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { jpyRate } from "@/lib/branches";
import { parsePart, type PartInput, type PartStatus } from "@/lib/parts";
import type { Currency } from "@/lib/types";
import { pingIndexNow } from "@/lib/indexnow";
import { withThumbs } from "@/lib/format";

function refresh() {
  revalidatePath("/admin/parts");
  revalidatePath("/parts", "layout");
  revalidateTag("public-site"); // flush the public parts data cache
}

/** Saves a part; returns its id so the editor can attach photos to a new part. */
export async function savePart(id: string | null, input: PartInput): Promise<{ error?: string; ok?: boolean; id?: string }> {
  await assertRole(["admin", "manager"]);
  // Re-validate on the server with the same rules as the bulk import.
  const { data, errors } = parsePart(input as unknown as Record<string, unknown>);
  if (errors.length) return { error: errors.join("; ") };
  if (data.year_from && data.year_to && data.year_from > data.year_to) return { error: "Year from is after year to." };
  const supabase = await createClient();
  if (!(data.cost_fx_rate > 0)) {
    const { data: s } = await supabase.from("settings").select("exchange_rates").single();
    const rate = jpyRate(data.cost_currency, (s?.exchange_rates ?? {}) as Partial<Record<Currency, number>>);
    if (!rate) return { error: `Enter the ${data.cost_currency} → JPY rate (or add it under Configuration → Exchange rates).` };
    data.cost_fx_rate = rate;
  }
  const res = id ? await supabase.from("parts").update(data).eq("id", id).select("id").single() : await supabase.from("parts").insert(data).select("id").single();
  if (res.error) return { error: res.error.code === "23505" ? `Part no. "${data.part_no}" is already used.` : res.error.message };
  if (data.show_on_website) pingIndexNow([`/parts/${encodeURIComponent(data.part_no)}`]);
  refresh();
  return { ok: true, id: res.data.id as string };
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
  const { data: imgs } = await supabase.from("part_images").select("path").eq("part_id", id);
  const { data, error } = await supabase.from("parts").delete().eq("id", id).select("photo_path").maybeSingle();
  if (error) throw new Error(error.message);
  const photos = (imgs ?? []).map((i) => i.path as string).filter((p) => !p.startsWith("site-assets:"));
  if (photos.length) await supabase.storage.from("vehicle-images").remove(withThumbs(photos));
  if (data?.photo_path) await supabase.storage.from("site-assets").remove([data.photo_path]);
  refresh();
}

/** Called by the bulk importer and the photo manager after they write through the browser client. */
export async function partsImported() {
  await assertRole(["admin", "manager"]);
  refresh();
}
