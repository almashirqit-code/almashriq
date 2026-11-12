"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { removePrivateFile } from "@/lib/private-files";
import { notifyShipping } from "@/lib/notify";
import { CURRENCIES, FREIGHT_TERMS, SHIPMENT_TYPES, type ChargesScope, type Currency, type FreightTerms, type ShipmentType } from "@/lib/types";

const TEXT = [
  "ship_company", "vessel_name", "voyage_no", "port_of_loading", "place_of_delivery", "forwarding_agent", "bl_no", "booking_no",
  "track_url", "container_no", "ship_invoice_details", "courier_service", "courier_company", "courier_tracking", "courier_details",
] as const;
const DATES = ["etd", "eta", "cut_off_date", "bl_date", "courier_date"] as const;
const MONEY = ["freight_charges", "thc_charges", "vanning_charges", "courier_charges"] as const;
/** Charges that are the same on every car of a container when they are entered as its totals. */
const CHARGES = ["freight_charges", "freight_currency", "freight_terms", "thc_charges", "vanning_charges", "courier_charges", "charges_scope"] as const;
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export type ShipmentInput = Partial<Record<(typeof TEXT)[number] | (typeof DATES)[number], string | null>> &
  Partial<Record<(typeof MONEY)[number], number | string | null>> & {
    shipment_type?: ShipmentType | "" | null;
    freight_currency?: Currency;
    freight_terms?: FreightTerms | "" | null;
    charges_scope?: ChargesScope;
  };

function refresh(vehicleId: string) {
  revalidatePath("/admin/stock");
  revalidatePath(`/admin/stock/${vehicleId}`);
  revalidatePath(`/admin/stock/${vehicleId}/shipping`);
  // freight, THC and vanning are booked as the car's expenses (migration 0044)
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/ledger");
  revalidateTag("public-site"); // shipped cars leave the website
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
  if ("freight_terms" in v) row.freight_terms = FREIGHT_TERMS.includes(v.freight_terms as FreightTerms) ? v.freight_terms : null;
  if ("charges_scope" in v) row.charges_scope = v.charges_scope === "container" ? "container" : "car";
  if (row.charges_scope === "container" && !row.container_no) return { error: "Enter the container no. to split the charges between its cars." };
  if (typeof row.track_url === "string" && !/^https?:\/\//i.test(row.track_url)) row.track_url = `https://${row.track_url}`;

  const supabase = await createClient();
  const { data: saved, error } = await supabase.from("vehicle_shipments").upsert(row, { onConflict: "vehicle_id" }).select("charges_scope, container_no").single();
  if (error) return { error: error.message };
  // Container totals are the same on every car of the container; the database splits them (migration 0044).
  const same = Object.fromEntries(CHARGES.filter((k) => k in row).map((k) => [k, row[k]]));
  if (saved.charges_scope === "container" && saved.container_no && Object.keys(same).length) {
    const { data: others, error: e2 } = await supabase
      .from("vehicle_shipments")
      .update({ ...same, updated_by: profile.id })
      .ilike("container_no", likeExact(saved.container_no as string))
      .neq("vehicle_id", vehicleId)
      .select("vehicle_id");
    if (e2) return { error: e2.message };
    for (const o of others ?? []) refresh(o.vehicle_id as string);
  }
  refresh(vehicleId);
  notifyShipping(vehicleId);
  return { ok: true };
}

export async function deleteVehicleDoc(docId: string, vehicleId: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: doc } = await supabase.from("vehicle_documents").select("path").eq("id", docId).single();
  const { error } = await supabase.from("vehicle_documents").delete().eq("id", docId);
  if (error) throw new Error(error.message);
  if (doc) await removePrivateFile("vehicle-docs", doc.path);
  refresh(vehicleId);
}

/** Called after documents are uploaded from the browser (B/L, waybill, surrender change the status). */
export async function refreshShipping(vehicleId: string) {
  await assertRole(["admin", "manager"]);
  refresh(vehicleId);
  notifyShipping(vehicleId);
}

/** What cars on one booking / BL / container have in common (not charges, courier or documents). */
const SHARED = [
  "ship_company", "vessel_name", "voyage_no", "etd", "eta", "port_of_loading", "place_of_delivery", "forwarding_agent",
  "cut_off_date", "bl_no", "bl_date", "booking_no", "track_url", "shipment_type", "container_no",
] as const;

/**
 * Copies this car's shared shipping info to other cars of the same shipment: the given ids,
 * or one car found by stock no. (to add it to the container).
 */
export async function shareShipment(vehicleId: string, to: { ids?: string[]; stockNo?: string }): Promise<{ error?: string; count?: number }> {
  const profile = await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: src } = await supabase.from("vehicle_shipments").select([...SHARED, ...CHARGES].join(",")).eq("vehicle_id", vehicleId).maybeSingle();
  const s = src as Record<(typeof SHARED)[number] | (typeof CHARGES)[number], unknown> | null;
  if (!s || !(s.booking_no || s.bl_no || s.container_no)) return { error: "Save a booking, BL or container no. first." };

  let ids = (to.ids ?? []).filter((x) => typeof x === "string" && x !== vehicleId).slice(0, 100);
  if (to.stockNo !== undefined) {
    const no = to.stockNo.trim();
    if (!no) return { error: "Enter a stock no." };
    const { data: v } = await supabase.from("vehicles").select("id").ilike("stock_no", no.replace(/[\\%_]/g, (c) => `\\${c}`)).maybeSingle();
    if (!v) return { error: `No car with stock no. ${no}` };
    if (v.id === vehicleId) return { error: "That is this car." };
    ids = [v.id as string];
  }
  if (!ids.length) return { count: 0 };

  // Container totals go with the container; a car's own charges stay its own.
  const copy = Object.fromEntries(Object.entries(s).filter(([k]) => s.charges_scope === "container" || !(CHARGES as readonly string[]).includes(k)));
  const rows = ids.map((id) => ({ ...copy, vehicle_id: id, updated_by: profile.id }));
  const { error } = await supabase.from("vehicle_shipments").upsert(rows, { onConflict: "vehicle_id" });
  if (error) return { error: error.message };
  for (const id of [vehicleId, ...ids]) refresh(id);
  return { count: ids.length };
}
