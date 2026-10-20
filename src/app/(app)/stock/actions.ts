"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { parseVehicle } from "@/lib/vehicle";
import { VEHICLE_FIELDS } from "@/lib/types";

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
  const { data, errors } = parseVehicle(formToRaw(formData));
  if (errors.length) return { error: errors.join(", ") };

  const supabase = await createClient();
  const { data: row, error } = await supabase.from("vehicles").insert(data).select("id").single();
  if (error) return { error: error.code === "23505" ? "Stock no. or chassis no. already exists" : error.message };

  revalidatePath("/stock");
  redirect(`/stock/${row.id}`);
}

export async function updateVehicle(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await assertRole(["admin", "manager"]);
  const { data, errors } = parseVehicle(formToRaw(formData));
  if (errors.length) return { error: errors.join(", ") };

  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update(data).eq("id", id);
  if (error) return { error: error.code === "23505" ? "Stock no. or chassis no. already exists" : error.message };

  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
  return { ok: true };
}

export async function deleteVehicle(id: string) {
  await assertRole(["admin"]);
  const supabase = await createClient();
  const { data: imgs } = await supabase.from("vehicle_images").select("path").eq("vehicle_id", id);
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (imgs?.length) await supabase.storage.from("vehicle-images").remove(imgs.map((i) => i.path));
  revalidatePath("/stock");
  redirect("/stock");
}

export async function deleteImage(imageId: string, vehicleId: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data: img } = await supabase.from("vehicle_images").select("path").eq("id", imageId).single();
  await supabase.from("vehicle_images").delete().eq("id", imageId);
  if (img) await supabase.storage.from("vehicle-images").remove([img.path]);
  revalidatePath(`/stock/${vehicleId}`);
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
  revalidatePath(`/stock/${vehicleId}`);
  revalidatePath("/stock");
}

export async function refreshVehicle(vehicleId: string) {
  revalidatePath(`/stock/${vehicleId}`);
  revalidatePath("/stock");
}
