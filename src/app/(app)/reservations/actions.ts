"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole, getProfile } from "@/lib/auth";
import { round } from "@/lib/format";
import { CURRENCIES, INCOTERMS, SHIPMENT_TYPES, hasFreight, hasInsurance, type Currency, type ShipmentType } from "@/lib/types";
import { loadRates, loadReserveVehicle } from "./data";

export type ReservationPayload = {
  id?: string;
  vehicle_id: string;
  customer_id: string;
  sales_agent_id: string | null;
  price_term: string;
  shipment_type: ShipmentType | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  freight_rate_id: string | null;
  currency: Currency;
  exchange_rate: number;
  sold_price: number;
  freight: number;
  insurance: number;
  reserved_until: string | null;
  notes: string | null;
};

function refresh(vehicleId: string, id?: string) {
  revalidatePath("/reservations");
  if (id) revalidatePath(`/reservations/${id}`);
  revalidatePath("/stock");
  revalidatePath(`/stock/${vehicleId}`);
  revalidatePath("/");
}

export async function saveReservation(p: ReservationPayload): Promise<{ id?: string; error?: string }> {
  const profile = await getProfile();
  const supabase = await createClient();

  if (!p.customer_id) return { error: "rv_pick_customer" };
  if (!CURRENCIES.includes(p.currency)) return { error: "Invalid currency" };
  const term = INCOTERMS.includes(p.price_term) ? (p.price_term as "FOB" | "CNF" | "CIF") : "FOB";
  const shipment = SHIPMENT_TYPES.includes(p.shipment_type as ShipmentType) ? p.shipment_type : null;
  const rate = p.currency === "JPY" ? 1 : Number(p.exchange_rate);
  if (!(rate > 0)) return { error: "Enter the exchange rate" };
  const sold = round(Number(p.sold_price) || 0, p.currency);
  if (!(sold > 0)) return { error: "Enter the sold price" };
  const freight = hasFreight(term) ? round(Math.max(0, Number(p.freight) || 0), p.currency) : 0;
  const insurance = hasInsurance(term) ? round(Math.max(0, Number(p.insurance) || 0), p.currency) : 0;

  const { rates } = await loadRates();
  const vehicle = await loadReserveVehicle(p.vehicle_id, rates);
  if (!vehicle) return { error: "Vehicle not found" };

  // Container-only ports (e.g. NS Kyushu) can't ship RoRo.
  if (shipment === "roro" && vehicle.port && !vehicle.port.shipment_modes.includes("roro")) {
    return { error: `${vehicle.stock_no} is at ${vehicle.port.name} — container shipment only. RoRo isn't available.` };
  }

  const row = {
    vehicle_id: p.vehicle_id,
    customer_id: p.customer_id,
    sales_agent_id: p.sales_agent_id || profile.id,
    price_term: term,
    shipment_type: shipment,
    port_of_loading: p.port_of_loading?.trim() || null,
    port_of_discharge: p.port_of_discharge?.trim() || null,
    freight_rate_id: hasFreight(term) && p.freight_rate_id ? p.freight_rate_id : null,
    currency: p.currency,
    exchange_rate: rate,
    sold_price: sold,
    freight,
    insurance,
    buying_cost_jpy: vehicle.cost.total,
    reserved_until: p.reserved_until || null,
    notes: p.notes?.trim() || null,
  };

  if (p.id) {
    const { data: existing } = await supabase.from("reservations").select("status").eq("id", p.id).single();
    if (!existing) return { error: "Reservation not found" };
    if (existing.status !== "active") return { error: "Only active reservations can be edited." };
    const { error } = await supabase.from("reservations").update(row).eq("id", p.id);
    if (error) return { error: error.message };
    refresh(p.vehicle_id, p.id);
    return { id: p.id };
  }

  if (vehicle.status !== "in_stock") return { error: "rv_not_available" };
  const { data, error } = await supabase
    .from("reservations")
    .insert({ ...row, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "rv_already" : error.message };
  refresh(p.vehicle_id, data.id);
  return { id: data.id as string };
}

export async function cancelReservation(id: string) {
  await getProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "active")
    .select("vehicle_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
  refresh(data.vehicle_id as string, id);
}

export async function deleteReservation(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data } = await supabase.from("reservations").select("vehicle_id").eq("id", id).single();
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (data) refresh(data.vehicle_id as string);
}
