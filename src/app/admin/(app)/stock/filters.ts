import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BRANCH_CODES } from "@/lib/branches";
import { SHIPPING_STATUSES, VEHICLE_STATUSES } from "@/lib/types";

export type StockFilter = { q?: string; status?: string; ship?: string; make?: string; branch?: string; agent?: string; customer?: string };

type Db = Awaited<ReturnType<typeof createClient>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Matches nothing, for an id filter that found no cars. */
const NONE = "00000000-0000-0000-0000-000000000000";

export const cleanQ = (q: string | null | undefined) => (q ?? "").trim().replace(/[%,()]/g, " ");
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Cars a filter on another table points at: the agent (sales agent or whoever created the
 * reservation), the customer (reservation or invoice), and the search text as a booking,
 * BL or container no. — so every car in one container comes up together.
 */
export async function relatedIds(supabase: Db, f: StockFilter) {
  const q = cleanQ(f.q);
  const agent = f.agent && UUID.test(f.agent) ? f.agent : null;
  const customer = f.customer && UUID.test(f.customer) ? f.customer : null;
  const [ships, byAgent, resCust, invCust] = await Promise.all([
    q ? supabase.from("vehicle_shipments").select("vehicle_id").or(`booking_no.ilike.%${q}%,bl_no.ilike.%${q}%,container_no.ilike.%${q}%`).limit(500) : null,
    agent ? supabase.from("reservations").select("vehicle_id").neq("status", "cancelled").or(`sales_agent_id.eq.${agent},created_by.eq.${agent}`).limit(2000) : null,
    customer ? supabase.from("reservations").select("vehicle_id").neq("status", "cancelled").eq("customer_id", customer).limit(2000) : null,
    customer
      ? supabase.from("invoice_items").select("vehicle_id, invoices!inner(customer_id, status)").eq("invoices.customer_id", customer).neq("invoices.status", "cancelled").not("vehicle_id", "is", null).limit(2000)
      : null,
  ]);
  const ids = (r: { data: { vehicle_id: string | null }[] | null } | null) => (r?.data ?? []).map((x) => x.vehicle_id).filter((x): x is string => !!x);
  let only: Set<string> | null = null;
  if (agent) only = new Set(ids(byAgent));
  if (customer) {
    const c = new Set([...ids(resCust), ...ids(invCust as { data: { vehicle_id: string | null }[] | null } | null)]);
    only = only ? new Set([...only].filter((x) => c.has(x))) : c;
  }
  return { ship: [...new Set(ids(ships))], only: only ? [...only] : null };
}

/** The search text as one PostgREST or-list: the car's own fields plus shipping refs. */
export function searchOr(q: string, shipIds: string[]) {
  const s = cleanQ(q);
  const ors = ["stock_no", "chassis_no", "make", "model", "grade", "color"].map((c) => `${c}.ilike.%${s}%`);
  if (shipIds.length) ors.push(`id.in.(${shipIds.join(",")})`);
  return ors.join(",");
}

/**
 * Shipped cars whose shipping record was never filled in still say `not_booked`;
 * the list and the filter treat them as shipped.
 */
export const effectiveShipping = (v: { status: string; shipping_status: string }) =>
  v.status === "shipped" && v.shipping_status === "not_booked" ? "shipped" : v.shipping_status;

// Supabase's builder is typed per table; the filters only need these methods.
type Filterable = {
  eq(column: string, value: unknown): Filterable;
  neq(column: string, value: unknown): Filterable;
  ilike(column: string, pattern: string): Filterable;
  in(column: string, values: readonly string[]): Filterable;
  or(filters: string): Filterable;
};

/** Applies the stock list filters (shared by the list and its Excel/CSV export; `rel` from relatedIds). */
export function applyStockFilters<T>(query: T, f: StockFilter, rel: { ship: string[]; only: string[] | null }): T {
  let x = query as unknown as Filterable;
  const { ship, only } = rel;
  if (f.status && (VEHICLE_STATUSES as string[]).includes(f.status)) x = x.eq("status", f.status);
  const shippedOr = f.ship === "shipped" ? "shipping_status.eq.shipped,and(status.eq.shipped,shipping_status.eq.not_booked)" : null;
  if (f.ship === "shipped") {
    // set below together with the search (one or-list per request)
  } else if (f.ship === "not_booked") x = x.eq("shipping_status", "not_booked").neq("status", "shipped");
  else if (f.ship && (SHIPPING_STATUSES as string[]).includes(f.ship)) x = x.eq("shipping_status", f.ship);
  // Case-insensitive: the data has both "Toyota" and "TOYOTA".
  if (f.make) x = x.ilike("make", likeExact(f.make.trim()));
  if (f.branch && (BRANCH_CODES as string[]).includes(f.branch)) x = x.eq("branch", f.branch);
  if (only) x = x.in("id", only.length ? only : [NONE]);
  const q = cleanQ(f.q);
  const searched = q ? searchOr(q, ship) : null;
  // Only one or-list per request, so a "shipped" filter and a search are combined in one.
  if (shippedOr && searched) x = x.or(`and(or(${shippedOr}),or(${searched}))`);
  else if (shippedOr || searched) x = x.or((shippedOr ?? searched)!);
  return x as unknown as T;
}
