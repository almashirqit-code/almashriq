import type { Metadata } from "next";
import { money } from "@/lib/format";
import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
import { requireActivePortal, getPortalTTs, getPortalSlips, SLIP_STATUS, fmtDate } from "@/lib/portal";
import { Card, Pill, Field, EmptyNote, SectionTitle } from "../ui";
import { SlipForm } from "./slip-form";

export const metadata: Metadata = { title: "My payments", robots: { index: false, follow: false } };

// remittances.status is generated from the allocated amount (migration 0003).
const TT_STATUS: Record<string, { label: string; cls: string }> = {
  unallocated: { label: "Received, not yet applied", cls: "bg-amber-100 text-amber-900" },
  partial: { label: "Partly applied", cls: "bg-sky-100 text-sky-900" },
  allocated: { label: "Fully applied", cls: "bg-emerald-100 text-emerald-900" },
};

export default async function AccountPayments() {
  await requireActivePortal();
  const [tts, slips] = await Promise.all([getPortalTTs(), getPortalSlips()]);

  return (
    <>
      <Card>
        <h2 className="text-lg font-black">Sent a payment? Upload the slip</h2>
        <p className="mb-4 mt-1 text-sm text-white/70">
          Send a photo or PDF of your TT / bank transfer slip. We match it with our bank and apply it to your cars. Only pay into the bank account printed on our invoice —{" "}
          <Link href="/verify-agent" className="inline-flex items-center gap-1 font-bold text-brand-700 hover:underline">
            <ShieldCheck className="h-3.5 w-3.5" /> check an agent or number
          </Link>{" "}
          if anyone asks you to pay somewhere else.
        </p>
        <SlipForm />
      </Card>

      {slips.length > 0 && (
        <>
          <SectionTitle title="Slips you sent" />
          <div className="grid gap-2">
            {slips.map((s) => {
              const st = SLIP_STATUS[s.status];
              return (
                <Card key={s.id} className="!p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-black tabular-nums">{money(s.amount, s.currency)}</div>
                      <div className="text-xs text-white/60">
                        Sent {fmtDate(s.sent_on)}
                        {s.reference ? ` · ${s.reference}` : ""}
                        {s.bank ? ` · ${s.bank}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`/api/payment-slip/${s.id}`} target="_blank" rel="noreferrer" className="glass inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold">
                        <FileText className="h-3.5 w-3.5" /> Slip
                      </a>
                      <Pill cls={st.cls}>{st.label}</Pill>
                    </div>
                  </div>
                  {s.staff_note && <p className="mt-2 text-sm text-white/80">Note from us: {s.staff_note}</p>}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle title="Payments received (TT)" />
      {!tts.length ? (
        <EmptyNote>No TT payments recorded yet. Once your transfer reaches our bank, it will show here.</EmptyNote>
      ) : (
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
      )}
    </>
  );
}
