import Link from "next/link";
import { Receipt, FileText, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole, can } from "@/lib/auth";
import { money, num } from "@/lib/format";
import type { Currency } from "@/lib/types";
import { PageHeader, Badge, Empty, Stat } from "@/components/ui";
import { SlipControls } from "./slip-controls";

export const metadata = { title: "Payment slips" };

type Row = {
  id: number;
  customer_id: string;
  currency: Currency;
  amount: number;
  sent_on: string;
  bank: string | null;
  reference: string | null;
  note: string | null;
  file_name: string;
  status: "submitted" | "received" | "rejected";
  staff_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  customers: { id: string; customer_no: number; name: string } | null;
};

const STATUS_STYLE: Record<Row["status"], string> = {
  submitted: "bg-amber-50 text-amber-800 ring-amber-200",
  received: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-slate-100 text-slate-600 ring-slate-200",
};
const STATUS_LABEL: Record<Row["status"], string> = { submitted: "waiting", received: "received", rejected: "not matched" };
const FILTERS = ["submitted", "received", "rejected", "all"] as const;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** TT / bank slips customers uploaded in their account. Check the bank, enter the TT, then mark it received. */
export default async function PaymentSlipsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const profile = await requireRole(["admin", "manager", "sales"]);
  const canReview = can.editStock(profile.role);
  const sp = await searchParams;
  const status = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof FILTERS)[number]) : "submitted";
  const supabase = await createClient();

  // RLS: only customers this user can see.
  let query = supabase.from("payment_slips").select("*, customers(id, customer_no, name)").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") query = query.eq("status", status);
  const [{ data }, { count: waiting }] = await Promise.all([
    query,
    supabase.from("payment_slips").select("id", { count: "exact", head: true }).eq("status", "submitted"),
  ]);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader
        icon={<Receipt />}
        tone="emerald"
        title="Payment slips"
        subtitle="TT / bank transfer slips customers uploaded in their account. Check the money reached the bank, enter the TT in Remittances, then mark the slip received."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="amber" label="Waiting to check" value={num(waiting ?? 0)} />
        <Stat tone="violet" label="Showing" value={num(rows.length)} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={`/admin/payment-slips?status=${f}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${f === status ? "bg-slate-900 text-white ring-slate-900" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
            >
              {f === "all" ? "all" : STATUS_LABEL[f]}
            </Link>
          ))}
          {canReview && (
            <Link href="/admin/remittances/new" className="btn-secondary ml-auto py-1.5 text-xs">
              <PlusCircle className="h-3.5 w-3.5" /> New TT
            </Link>
          )}
        </div>
        {rows.length === 0 ? (
          <Empty>{status === "submitted" ? "No slips waiting. New ones appear here when a customer uploads one." : "Nothing here."}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>{canReview ? "Check" : ""}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.status === "submitted" ? "bg-amber-50/30" : ""}>
                    <td className="max-w-[14rem]">
                      {r.customers ? (
                        <Link href={`/admin/customers/${r.customers.id}`} className="font-semibold text-brand-700 hover:underline">
                          #{r.customers.customer_no} {r.customers.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <div className="text-xs text-slate-500">Uploaded {when(r.created_at)}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="font-semibold tabular-nums text-slate-800">{money(r.amount, r.currency)}</div>
                      <div className="text-xs text-slate-500">Sent {r.sent_on}</div>
                    </td>
                    <td className="max-w-[18rem] text-xs text-slate-600">
                      {r.bank && <div>Bank: {r.bank}</div>}
                      {r.reference && <div>Ref: {r.reference}</div>}
                      {r.note && <div className="italic">“{r.note}”</div>}
                      <a href={`/api/payment-slip/${r.id}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                        <FileText className="h-3.5 w-3.5" /> {r.file_name}
                      </a>
                    </td>
                    <td>
                      <Badge className={STATUS_STYLE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {r.staff_note && <div className="mt-1 max-w-[12rem] text-xs text-slate-500">{r.staff_note}</div>}
                    </td>
                    <td className="min-w-[16rem]">{canReview && <SlipControls id={r.id} status={r.status} />}</td>
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
