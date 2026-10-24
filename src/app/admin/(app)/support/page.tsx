import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { num } from "@/lib/format";
import { PageHeader, Empty, Stat } from "@/components/ui";
import { LiveRefresh } from "./live-refresh";

export const metadata = { title: "Support" };

type Thread = {
  id: string;
  display_name: string;
  email: string | null;
  customer_id: string | null;
  assigned_to: string | null;
  status: "open" | "closed";
  last_message: string | null;
  last_message_at: string;
  staff_unread: number;
};

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
  { key: "closed", label: "Closed" },
] as const;
const UUID = /^[0-9a-f-]{36}$/i;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** Customer chats from the portal. Who sees what is decided in the database (staff_can_see_thread). */
export default async function SupportInbox({ searchParams }: { searchParams: Promise<{ filter?: string; customer?: string }> }) {
  const me = await getProfile();
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as (typeof FILTERS)[number]["key"]) : "open";
  const supabase = await createClient();

  let q = supabase
    .from("support_threads")
    .select("id, display_name, email, customer_id, assigned_to, status, last_message, last_message_at, staff_unread")
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (filter === "closed") q = q.eq("status", "closed");
  else q = q.eq("status", "open");
  if (filter === "mine") q = q.eq("assigned_to", me.id);
  if (filter === "unassigned") q = q.is("assigned_to", null);
  if (sp.customer && UUID.test(sp.customer)) q = q.eq("customer_id", sp.customer);

  const [{ data }, { data: people }, { count: unread }] = await Promise.all([
    q,
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("support_threads").select("id", { count: "exact", head: true }).eq("status", "open").gt("staff_unread", 0),
  ]);
  const threads = (data ?? []) as Thread[];
  const names = new Map((people ?? []).map((p) => [p.id as string, (p.full_name || p.email) as string]));

  return (
    <>
      <LiveRefresh />
      <PageHeader icon={<MessagesSquare />} tone="fuchsia" title="Support" subtitle="Chats from customers' accounts. New messages appear here live." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="brand" label="Waiting for a reply" value={num(unread ?? 0)} />
        <Stat tone="violet" label="Showing" value={num(threads.length)} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/support?filter=${f.key}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${f.key === filter ? "bg-slate-900 text-white ring-slate-900" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        {threads.length === 0 ? (
          <Empty>{filter === "open" ? "No open conversations. When a customer writes from their account, it shows up here." : "Nothing here."}</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/support/${t.id}`} className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 ${t.staff_unread ? "bg-rose-50/40" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className={`truncate text-sm ${t.staff_unread ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}>{t.display_name}</span>
                      {!t.customer_id && <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-bold uppercase text-amber-700 ring-1 ring-amber-200">Not linked</span>}
                      <span className="text-xs text-slate-400">{t.email}</span>
                    </div>
                    <p className="truncate text-sm text-slate-600">{t.last_message ?? "—"}</p>
                    <p className="text-xs text-slate-400">
                      {when(t.last_message_at)} · {t.assigned_to ? names.get(t.assigned_to) ?? "Agent" : "Unassigned"}
                    </p>
                  </div>
                  {t.staff_unread > 0 && (
                    <span className="mt-1 min-w-6 rounded-full bg-brand-600 px-2 text-center text-xs font-bold leading-6 text-white">{t.staff_unread}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
