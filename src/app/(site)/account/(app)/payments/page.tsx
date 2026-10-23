import type { Metadata } from "next";
import { money } from "@/lib/format";
import { requireActivePortal, getPortalTTs, fmtDate } from "@/lib/portal";
import { Card, Pill, Field, EmptyNote } from "../ui";

export const metadata: Metadata = { title: "My payments", robots: { index: false, follow: false } };

// remittances.status is generated from the allocated amount (migration 0003).
const TT_STATUS: Record<string, { label: string; cls: string }> = {
  unallocated: { label: "Received, not yet applied", cls: "bg-amber-100 text-amber-900" },
  partial: { label: "Partly applied", cls: "bg-sky-100 text-sky-900" },
  allocated: { label: "Fully applied", cls: "bg-emerald-100 text-emerald-900" },
};

export default async function AccountPayments() {
  await requireActivePortal();
  const tts = await getPortalTTs();
  if (!tts.length) return <EmptyNote>No TT payments recorded yet. Once your transfer reaches our bank, it will show here.</EmptyNote>;

  return (
    <div className="grid gap-3">
      {tts.map((t) => {
        const st = TT_STATUS[t.status] ?? { label: t.status.replace(/_/g, " "), cls: "bg-slate-200 text-slate-800" };
        return (
          <Card key={t.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/60">TT #{t.id}</div>
                <div className="text-2xl font-black tabular-nums">{money(t.remit_amount ?? t.instructed_amount, t.currency)}</div>
              </div>
              <Pill cls={st.cls}>{st.label}</Pill>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Sent">{fmtDate(t.remit_date)}</Field>
              <Field label="Received">{fmtDate(t.received_date)}</Field>
              <Field label="Bank charges">{t.bank_charges ? money(t.bank_charges, t.currency) : "—"}</Field>
              <Field label="Not yet applied">{money(t.remaining_amount, t.currency)}</Field>
              <Field label="Remitter">{t.remitter}</Field>
              <Field label="Bank">{t.bank}</Field>
            </dl>
            {t.allocations.length > 0 && (
              <div className="mt-4 border-t border-current/10 pt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/60">Applied to</div>
                <ul className="grid gap-1 text-sm">
                  {t.allocations.map((a, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="truncate">
                        {a.stock_no} · {a.make} {a.model}
                      </span>
                      <span className="font-semibold tabular-nums">{money(a.amount, t.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
