"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { SHIPMENT_MODES, type ShipmentMode } from "@/lib/types";

export type MasterKind = "ports" | "auction_houses" | "yards";
type Result = { error?: string; ok?: boolean };

const str = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
const uuidOrNull = (v: unknown) => {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : null;
};

function friendly(error: { code?: string; message: string }) {
  if (error.code === "23505") return "m_name_taken";
  if (error.code === "23503") return "m_in_use";
  if (error.code === "23514") return "m_pick_mode";
  return error.message;
}

function refresh() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/stock");
}

/** Create (no id) or update a row in one of the master lists. */
export async function saveMaster(kind: MasterKind, id: string | null, values: Record<string, unknown>): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const name = str(values.name);
  if (!name) return { error: "Name is required" };

  let row: Record<string, unknown>;
  if (kind === "ports") {
    const modes = (Array.isArray(values.shipment_modes) ? values.shipment_modes : []).filter((m): m is ShipmentMode =>
      SHIPMENT_MODES.includes(m as ShipmentMode)
    );
    if (!modes.length) return { error: "m_pick_mode" };
    row = { name, shipment_modes: modes, region: str(values.region), notes: str(values.notes), active: values.active !== false };
  } else if (kind === "auction_houses") {
    row = { name, port_id: uuidOrNull(values.port_id), notes: str(values.notes), active: values.active !== false };
  } else {
    row = {
      name,
      port_id: uuidOrNull(values.port_id),
      address: str(values.address),
      contact: str(values.contact),
      phone: str(values.phone),
      notes: str(values.notes),
      active: values.active !== false,
    };
  }

  const supabase = await createClient();
  const { error } = id ? await supabase.from(kind).update(row).eq("id", id) : await supabase.from(kind).insert(row);
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: true };
}

export async function deleteMaster(kind: MasterKind, id: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();

  // Vehicles keep their record but lose the link; ports in use are protected by the database.
  const { error } = await supabase.from(kind).delete().eq("id", id);
  if (error) return { error: friendly(error) };
  refresh();
  return { ok: true };
}
