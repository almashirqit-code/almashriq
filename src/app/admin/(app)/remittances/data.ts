import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { DEFAULT_RATES, type Currency, type Settings } from "@/lib/types";
import type { CustomerOption } from "./remittance-form";

export async function loadFormData() {
  const supabase = await createClient();
  const me = await getProfile();
  const [customers, settings] = await Promise.all([
    supabase.from("customers").select("id, customer_no, name, company, phone, email").order("name").limit(10000),
    supabase.from("settings").select("*").single(),
  ]);
  const s = settings.data as Settings | null;
  return {
    customers: (customers.data ?? []) as CustomerOption[],
    // A manager tied to an office records TTs for that office only.
    offices: me.role !== "admin" && me.office ? [me.office] : s?.offices?.length ? s.offices : ["Head Office"],
    shifts: s?.shifts ?? [],
    defaultOffice: me.office ?? null,
    defaultShift: me.shift ?? null,
    rates: { ...DEFAULT_RATES, ...(s?.exchange_rates ?? {}) } as Record<Currency, number>,
  };
}
