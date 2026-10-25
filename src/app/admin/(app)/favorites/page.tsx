import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { num } from "@/lib/format";
import { PageHeader, Badge, Empty, Stat } from "@/components/ui";

export const metadata = { title: "Most wanted" };

type Kind = "vehicle" | "part" | "machine";
type Top = { item_kind: Kind; item_id: string; stock_no: string | null; title: string | null; people: number; adds: number; last_at: string; status: string | null };
type Recent = {
  id: number;
  item_kind: Kind;
  item_id: string;
  stock_no: string | null;
  created_at: string;
  customer_id: string | null;
  customers: { customer_no: number; name: string } | null;
};

const PERIODS = [7, 30, 90] as const;
const KIND_LABEL: Record<Kind, string> = { vehicle: "Car", part: "Part", machine: "Machine" };
const KIND_STYLE: Record<Kind, string> = {
  vehicle: "bg-sky-50 text-sky-800 ring-sky-200",
  part: "bg-amber-50 text-amber-800 ring-amber-200",
  machine: "bg-violet-50 text-violet-800 ring-violet-200",
};
const when = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Admin link for cars; parts and machinery open their public page. */
function itemHref(kind: Kind, id: string, stock: string | null) {
  if (kind === "vehicle") return `/admin/stock/${id}`;
  return `/${kind === "part" ? "parts" : "machinery"}/${encodeURIComponent(stock ?? "")}`;
}

/** Items visitors and customers saved to their favourites: what buyers want right now. */
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireRole(["admin", "manager"]);
  const sp = await searchParams;
  const days = (PERIODS as readonly number[]).includes(Number(sp.days)) ? Number(sp.days) : 30;
  const supabase = await createClient();

  const [{ data: top }, { data: recent }] = await Promise.all([
    supabase.rpc("staff_favorite_top", { p_days: days }),
    supabase
      .from("favorite_events")
      .select("id, item_kind, item_id, stock_no, created_at, customer_id, customers(customer_no, name)")
      .eq("action", "add")
      .not("customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const rows = (top ?? []) as Top[];
  const saves = (recent ?? []) as unknown as Recent[];
  const totalPeople = rows.reduce((s, r) => s + Number(r.people), 0);

  return (
    <>
      <PageHeader icon={<Heart />} tone="fuchsia" title="Most wanted" subtitle="Cars, parts and machines that visitors saved to their favourites on the website." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="fuchsia" label={`Items saved (${days} days)`} value={num(rows.length)} />
        <Stat tone="violet" label="Saves by different people" value={num(totalPeople)} />
      </div>

      <div className="card mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          {PERIODS.map((d) => (
            <Link
              key={d}
              href={`/admin/favorites?days=${d}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${d === days ? "bg-slate-900 text-white ring-slate-900" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              Last {d} days
            </Link>
          ))}
        </div>
        {rows.length === 0 ? (
          <Empty>Nothing saved in this period yet. Items appear here when visitors tap the heart on the website.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th className="text-right">People</th>
                  <th className="text-right">Saves</th>
                  <th>Status</th>
                  <th>Last saved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.item_kind}:${r.item_id}`}>
                    <td className="max-w-[20rem]">
                      <Link href={itemHref(r.item_kind, r.item_id, r.stock_no)} className="font-semibold text-brand-700 hover:underline">
                        {r.stock_no ?? "—"}
                      </Link>
                      <div className="line-clamp-1 text-xs text-slate-500">{r.title || "—"}</div>
                    </td>
                    <td>
                      <Badge className={KIND_STYLE[r.item_kind]}>{KIND_LABEL[r.item_kind]}</Badge>
                    </td>
                    <td className="text-right font-bold text-slate-800">{num(Number(r.people))}</td>
                    <td className="text-right text-slate-600">{num(Number(r.adds))}</td>
                    <td className="text-xs capitalize text-slate-600">{r.status?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{when(r.last_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 font-bold text-slate-800">Recent saves by customers</h2>
        {saves.length === 0 ? (
          <Empty>No signed-in customer has saved an item yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Saved</th>
                </tr>
              </thead>
              <tbody>
                {saves.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.customers ? (
                        <Link href={`/admin/customers/${s.customer_id}`} className="font-semibold text-brand-700 hover:underline">
                          #{s.customers.customer_no} {s.customers.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Badge className={KIND_STYLE[s.item_kind]}>{KIND_LABEL[s.item_kind]}</Badge>{" "}
                      <Link href={itemHref(s.item_kind, s.item_id, s.stock_no)} className="text-sm text-slate-700 hover:underline">
                        {s.stock_no ?? "—"}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{when(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
