"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { CURRENCIES, SHIPMENT_TYPES, type Currency, type ShipmentType } from "@/lib/types";

const TEXT = [
  "ship_company", "vessel_name", "voyage_no", "port_of_loading", "place_of_delivery", "forwarding_agent", "bl_no", "booking_no",
  "track_url", "container_no", "ship_invoice_details", "courier_service", "courier_company", "courier_tracking", "courier_details",
] as const;
const DATES = ["etd", "eta", "cut_off_date", "bl_date", "courier_date"] as const;
const MONEY = ["freight_charges", "vanning_charges", "courier_charges"] as const;

export type ShipmentInput = Partial<Record<(typeof TEXT)[number] | (typeof DATES)[number], string | null>> &
  Partial<Record<(typeof MONEY)[number], number | string | null>> & {
    shipment_type?: ShipmentType | "" | null;
    freight_currency?: Currency;
  };

function refresh(vehicleId: string) {
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/stock/${vehicleId}`);
  revalidatePath(`/admin/stock/${vehicleId}/shipping`);
}

/** Saves the shipping or courier part (only the keys sent are changed). */
export async function saveShipment(vehicleId: string, v: ShipmentInput): Promise<{ error?: string; ok?: boolean }> {
  const profile = await assertRole(["admin", "manager"]);
  const row: Record<string, unknown> = { vehicle_id: vehicleId, updated_by: profile.id };
  for (const k of TEXT) if (k in v) row[k] = String(v[k] ?? "").trim() || null;
  for (const k of DATES) if (k in v) row[k] = /^\d{4}-\d{2}-\d{2}$/.test(String(v[k] ?? "")) ? v[k] : null;
  for (const k of MONEY) {
    if (!(k in v)) continue;
    const n = v[k] === "" || v[k] == null ? null : Number(v[k]);
    if (n !== null && (!Number.isFinite(n) || n < 0)) return { error: `${k}: not a valid amount` };
    row[k] = n;
  }
  if ("shipment_type" in v) row.shipment_type = SHIPMENT_TYPES.includes(v.shipment_type as ShipmentType) ? v.shipment_type : null;
  if ("freight_currency" in v) row.freight_currency = CURRENCIES.includes(v.freight_currency as Currency) ? v.freight_currency : "USD";
  if (typeof row.track_url === "string" && !/^https?:\/\//i.test(row.track_url)) row.track_url = `https://${row.track_url}`;

  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_shipments").upsert(row, { onConflict: "vehicle_id" });
  if (error) return { error: error.message };
  refresh(vehicleId);
  return { ok: true };
}

export async function deleteVehicleDoc(docId: string, vehicleId: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: doc } = await supabase.from("vehicle_documents").select("path").eq("id", docId).single();
  const { error } = await supabase.from("vehicle_documents").delete().eq("id", docId);
  if (error) throw new Error(error.message);
  if (doc) await supabase.storage.from("vehicle-docs").remove([doc.path]);
  refresh(vehicleId);
}

export async function refreshShipping(vehicleId: string) {
  refresh(vehicleId);
}
