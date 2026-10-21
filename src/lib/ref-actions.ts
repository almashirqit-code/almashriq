"use server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";

export type RefKind = "vehicle" | "part" | "machinery";

/**
 * Next free reference number across ALL records (not just the rows on screen):
 * vehicle → AM-36167, part → P-1001, machinery → M-2002. Suggested in the "Add" forms
 * and used automatically when the field is left blank.
 */
export async function nextRef(kind: RefKind): Promise<string> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("next_ref", { p_kind: kind });
  if (error) throw new Error(error.message);
  return data as string;
}
