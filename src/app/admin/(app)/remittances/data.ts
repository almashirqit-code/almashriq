import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { getProfile } from "@/lib/auth";
import { DEFAULT_RATES, type Currency, type Settings } from "@/lib/types";
import type { CustomerOption } from "./remittance-form";

export async function loadFormData() {
  const supabase = await createClient();
  const me = await getProfile();
  const [customers, settings] = await Promise.all([
    // Pickers and totals must see every row: the API returns at most 1,000 per request.
    fetchAll((from, to) => supabase.from("customers").select("id, customer_no, name, company, phone, email").order("name").order("id").range(from, to)).then((data) => ({ data })),
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
