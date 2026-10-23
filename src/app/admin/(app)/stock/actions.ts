"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { parseVehicle } from "@/lib/vehicle";
import { VEHICLE_FIELDS, VEHICLE_STATUSES, type VehicleStatus } from "@/lib/types";
import { pingIndexNow } from "@/lib/indexnow";

export type FormState = { error?: string; ok?: boolean };

function formToRaw(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const f of VEHICLE_FIELDS) {
    // Last value wins (checkbox after its hidden "false" fallback).
    if (formData.has(f)) raw[f] = formData.getAll(f).pop();
  }
  return raw;
}

export async function createVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const raw = formToRaw(formData);
  // Stock no. left blank → next automatic number (AM-…).
  if (!String(raw.stock_no ?? "").trim()) {
    const { data: no } = await supabase.rpc("next_ref", { p_kind: "vehicle" });
    if (no) raw.stock_no = no;
  }
  const { data, errors } = parseVehicle(raw);
  if (errors.length) return { error: errors.join(", ") };

  const { data: row, error } = await supabase.from("vehicles").insert(data).select("id").single();
  if (error) return { error: error.code === "23505" ? "Stock no. or chassis no. already exists" : error.message };

  if (data.show_on_website !== false) pingIndexNow([`/cars/${encodeURIComponent(String(data.stock_no))}`]);
  revalidatePath("/admin/stock");
  redirect(`/admin/stock/${row.id}`);
}

export async function updateVehicle(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin", "manager"]);
  const { data, errors } = parseVehicle(formToRaw(formData));
  if (errors.length) return { error: errors.join(", ") };

  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update(data).eq("id", id);
  if (error) return { error: error.code === "23505" ? "Stock no. or chassis no. already exists" : error.message };

  if (data.show_on_website !== false) pingIndexNow([`/cars/${encodeURIComponent(String(data.stock_no))}`]);
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/stock/${id}`);
  return { ok: true };
}

/** Admin: set the status by hand (settling old data). A reason is required; the change is logged. */
export async function setVehicleStatusManual(id: string, status: VehicleStatus, note: string): Promise<{ error?: string; ok?: boolean }> {
  await assertRole(["admin"]);
  if (!VEHICLE_STATUSES.includes(status)) return { error: "Choose a status." };
  if (!note.trim()) return { error: "Give a reason for the change." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_vehicle_status", { p_vehicle: id, p_status: status, p_note: note.trim() });
  if (error) return { error: error.message };
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/stock/${id}`);
  return { ok: true };
}

/** Admin: hand the status back to the automatic rules (invoices / reservations decide it again). */
export async function releaseVehicleStatus(id: string): Promise<{ error?: string; ok?: boolean }> {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_vehicle_status", { p_vehicle: id, p_note: null });
  if (error) return { error: error.message };
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/stock/${id}`);
  return { ok: true };
}

export async function deleteVehicle(id: string) {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const [{ data: imgs }, { data: yard }] = await Promise.all([
    supabase.from("vehicle_images").select("path").eq("vehicle_id", id),
    supabase.from("vehicle_yard_images").select("path").eq("vehicle_id", id),
  ]);
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // Photo rows cascade with the car; remove the files too (listing + in-yard photos).
  const paths = [...(imgs ?? []), ...(yard ?? [])].map((i) => i.path).filter((p) => !p.startsWith("site-assets:"));
  if (paths.length) await supabase.storage.from("vehicle-images").remove(paths);
  revalidatePath("/admin/stock");
  redirect("/admin/stock");
}

export async function deleteImage(imageId: string, vehicleId: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: img } = await supabase.from("vehicle_images").select("path").eq("id", imageId).single();
  await supabase.from("vehicle_images").delete().eq("id", imageId);
  if (img) await supabase.storage.from("vehicle-images").remove([img.path]);
  revalidatePath(`/admin/stock/${vehicleId}`);
}

export async function setCoverImage(imageId: string, vehicleId: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: imgs } = await supabase
    .from("vehicle_images")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .order("sort_order");
  const ordered = [imageId, ...(imgs ?? []).map((i) => i.id).filter((id) => id !== imageId)];
  await Promise.all(
    ordered.map((id, i) => supabase.from("vehicle_images").update({ sort_order: i }).eq("id", id))
  );
  revalidatePath(`/admin/stock/${vehicleId}`);
  revalidatePath("/admin/stock");
}

/** Quick on/off switches used by the Actions menu on the stock list. */
export async function setVehicleFlag(id: string, field: "show_on_website" | "for_parts", value: boolean) {
  await assertRole(["admin", "manager"]);
  if (field !== "show_on_website" && field !== "for_parts") throw new Error("Invalid field");
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update({ [field]: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/stock/${id}`);
  revalidatePath("/");
  revalidatePath("/cars");
}

export type MakeAvailableResult = {
  ok?: boolean;
  error?: string;
  /** TT money still allocated to this car — must be unallocated first */
  remittances?: number[];
  /** invoices that block the reset (payments recorded, or other cars on them) */
  blockingInvoices?: { id: string; invoice_no: string; reason: "paid" | "multi" }[];
};

/**
 * "Make available": deletes the car's invoice(s) and reservation(s) so it goes back to In stock.
 * Refuses while TT money is allocated to the car or the invoice has payments / other cars on it.
 */
export async function makeAvailable(id: string): Promise<MakeAvailableResult> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();

  // 1. TT allocations must be removed first.
  const { data: allocs } = await supabase.from("remittance_allocations").select("remittance_id").eq("vehicle_id", id);
  if (allocs?.length) return { remittances: [...new Set<number>(allocs.map((a: { remittance_id: number }) => Number(a.remittance_id)))] };

  // 2. Live invoices containing this car.
  const { data: items } = await supabase
    .from("invoice_items")
    .select("invoice_id, invoices!inner(id, invoice_no, status, amount_paid)")
    .eq("vehicle_id", id)
    .neq("invoices.status", "cancelled")
    .eq("invoices.doc_type", "invoice");
  type Inv = { id: string; invoice_no: string; status: string; amount_paid: number };
  const invoices: Inv[] = [
    ...new Map<string, Inv>((items ?? []).map((i: { invoice_id: string; invoices: unknown }) => [i.invoice_id, i.invoices as Inv])).values(),
  ];

  const blocking: NonNullable<MakeAvailableResult["blockingInvoices"]> = [];
  for (const inv of invoices) {
    const { count: payCount } = await supabase.from("payments").select("id", { count: "exact", head: true }).eq("invoice_id", inv.id);
    if ((payCount ?? 0) > 0 || Number(inv.amount_paid) > 0) {
      blocking.push({ id: inv.id, invoice_no: inv.invoice_no, reason: "paid" });
      continue;
    }
    const { count: others } = await supabase
      .from("invoice_items")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", inv.id)
      .not("vehicle_id", "is", null)
      .neq("vehicle_id", id);
    if ((others ?? 0) > 0) blocking.push({ id: inv.id, invoice_no: inv.invoice_no, reason: "multi" });
  }
  if (blocking.length) return { blockingInvoices: blocking };

  // 3. Delete the invoices (items first so status triggers run), then the reservations.
  for (const inv of invoices) {
    const { error: e1 } = await supabase.from("invoice_items").delete().eq("invoice_id", inv.id);
    if (e1) return { error: e1.message };
    const { error: e2 } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (e2) return { error: e2.message };
  }
  const { error: e3 } = await supabase.from("reservations").delete().eq("vehicle_id", id).in("status", ["active", "invoiced"]);
  if (e3) return { error: e3.message };

  // 4. Back to stock (also covers cars marked shipped by hand).
  const { error: e4 } = await supabase.from("vehicles").update({ status: "in_stock" }).eq("id", id);
  if (e4) return { error: e4.message };

  revalidatePath("/admin/stock");
  revalidatePath(`/admin/stock/${id}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin");
  return { ok: true };
}

export async function refreshVehicle(vehicleId: string) {
  revalidatePath(`/admin/stock/${vehicleId}`);
  revalidatePath("/admin/stock");
}
