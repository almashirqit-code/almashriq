import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Active users that customers can be tagged with. */
export async function loadStaff() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email, active").order("full_name");
  return (data ?? []).filter((p) => p.active).map((p) => ({ id: p.id as string, name: (p.full_name || p.email) as string }));
}
