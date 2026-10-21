import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

/**
 * Staff a customer can be tagged with, for the signed-in user:
 * sales → only themselves; manager with an office → staff of that office; others → everyone.
 */
export async function loadStaff() {
  const me = await getProfile();
  if (me.role === "sales") return [{ id: me.id, name: me.full_name || me.email }];
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email, active, office").order("full_name");
  return (data ?? [])
    .filter((p) => p.active && (me.role === "admin" || !me.office || !p.office || p.office === me.office))
    .map((p) => ({ id: p.id as string, name: `${p.full_name || p.email}${p.office ? ` · ${p.office}` : ""}` }));
}
