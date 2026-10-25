"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { jpyRate } from "@/lib/branches";
import { parseMachine, type MachineInput } from "@/lib/machinery";
import type { Currency, VehicleStatus } from "@/lib/types";
import { pingIndexNow } from "@/lib/indexnow";
import { withThumbs } from "@/lib/format";

function refresh() {
  revalidatePath("/admin/machinery");
  revalidatePath("/machinery", "layout");
  revalidateTag("public-site"); // flush the public machinery data cache
}

/** Saves a machine; returns its id so the editor can attach photos to a new one. */
export async function saveMachine(id: string | null, input: MachineInput): Promise<{ error?: string; ok?: boolean; id?: string }> {
  await assertRole(["admin", "manager"]);
  // Re-validate on the server with the same rules as the bulk import.
  const { data, errors } = parseMachine(input as unknown as Record<string, unknown>);
  if (errors.length) return { error: errors.join("; ") };
  const supabase = await createClient();
  if (!(data.cost_fx_rate > 0)) {
    const { data: s } = await supabase.from("settings").select("exchange_rates").single();
    const rate = jpyRate(data.cost_currency, (s?.exchange_rates ?? {}) as Partial<Record<Currency, number>>);
    if (!rate) return { error: `Enter the ${data.cost_currency} → JPY rate (or add it under Configuration → Exchange rates).` };
    data.cost_fx_rate = rate;
  }
  const res = id ? await supabase.from("machinery").update(data).eq("id", id).select("id").single() : await supabase.from("machinery").insert(data).select("id").single();
  if (res.error) return { error: res.error.code === "23505" ? `Stock no. "${data.stock_no}" is already used.` : res.error.message };
  if (data.show_on_website) pingIndexNow([`/machinery/${encodeURIComponent(data.stock_no)}`]);
  refresh();
  return { ok: true, id: res.data.id as string };
}

export async function setMachineStatus(id: string, status: VehicleStatus) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("machinery").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function toggleMachineWebsite(id: string, show: boolean) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("machinery").update({ show_on_website: show }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteMachine(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: imgs } = await supabase.from("machinery_images").select("path").eq("machinery_id", id);
  const { error } = await supabase.from("machinery").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const paths = (imgs ?? []).map((i) => i.path as string);
  if (paths.length) await supabase.storage.from("vehicle-images").remove(withThumbs(paths));
  refresh();
}

/** Called by the bulk importer and the photo manager after they write through the browser client. */
export async function machineryImported() {
  await assertRole(["admin", "manager"]);
  refresh();
}
