import Link from "next/link";
import { Check } from "lucide-react";

/** Small building blocks for the customer account pages (site glass look). */

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>;
}

export function Pill({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
}

export function SectionTitle({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between gap-3">
      <h2 className="text-lg font-black">{title}</h2>
      {href && link && (
        <Link href={href} className="text-sm font-bold text-brand-700 hover:underline">
          {link} →
        </Link>
      )}
    </div>
  );
}

/** Empty list: say what will appear here, and (optionally) the one next step. */
export function EmptyNote({ children, href, cta }: { children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="glass rounded-2xl p-6 text-center">
      <p className="text-sm text-white/70">{children}</p>
      {href && cta && (
        <Link href={href} className="mt-3 inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-brand-700">
          {cta}
        </Link>
      )}
    </div>
  );
}

/** One step of a car's journey from reservation to arrival. */
export type JourneyStep = { label: string; done: boolean; date?: string | null; hint?: string };

/**
 * The car's journey in plain words, from the data the portal already has. Payment counts as received
 * once a TT has been applied to the car; dates are the ones the ERP records (some steps have none).
 */
export function carJourney(
  v: { stock_no: string; shipping_status: "not_booked" | "booked" | "shipped" | "delivered" | null; etd: string | null; eta: string | null; bl_date: string | null; courier_date: string | null; courier_tracking: string | null },
  paidOn: string | null | undefined,
): JourneyStep[] {
  const s = v.shipping_status ?? "not_booked";
  const booked = s !== "not_booked";
  const shipped = s === "shipped" || s === "delivered";
  return [
    { label: "Car reserved for you", done: true },
    { label: "Payment received", done: paidOn !== undefined, date: paidOn, hint: "Send the TT to the bank on your invoice, then upload the slip." },
    { label: "Preparing for export", done: booked, hint: "Export papers and inspection, usually 1–2 weeks." },
    { label: "Booked on a ship", done: booked, hint: "We book the next vessel to your port." },
    { label: "Shipped", done: shipped, date: v.bl_date ?? (shipped ? v.etd : null), hint: "Tracking appears after the ship leaves Japan." },
    { label: "Documents sent by courier", done: !!v.courier_date, date: v.courier_date, hint: "Original B/L and papers go by DHL once the ship sails." },
    { label: "Arrived at your port", done: s === "delivered", date: v.eta, hint: v.eta ? "Estimated arrival date." : undefined },
  ];
}

/** Stock no. → date the first TT applied to that car arrived (null if the date isn't recorded). */
export function paidDates(tts: { received_date: string | null; remit_date: string | null; allocations: { stock_no: string }[] }[]) {
  const m = new Map<string, string | null>();
  for (const t of tts) for (const a of t.allocations) if (!m.has(a.stock_no)) m.set(a.stock_no, t.received_date ?? t.remit_date);
  return m;
}

/** The first step not yet done (the one the customer is waiting on), or null when finished. */
export const currentStep = (steps: JourneyStep[]) => steps.find((x) => !x.done) ?? null;

/** Vertical step list: done steps ticked with their date, the current one highlighted with what to expect. */
export function Journey({ steps, fmt }: { steps: JourneyStep[]; fmt: (d: string | null | undefined) => string }) {
  const cur = currentStep(steps);
  return (
    <ol className="relative grid gap-0" aria-label="Progress">
      {steps.map((st, i) => {
        const now = st === cur;
        return (
          <li key={st.label} className="relative flex gap-3 pb-4 last:pb-0" aria-current={now ? "step" : undefined}>
            {i < steps.length - 1 && <span aria-hidden className={`absolute left-[11px] top-6 h-[calc(100%-1rem)] w-0.5 ${st.done ? "bg-[var(--accent)]" : "bg-current opacity-15"}`} />}
            <span
              aria-hidden
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                st.done ? "bg-[var(--accent)] text-white" : now ? "bg-white ring-2 ring-[var(--accent)]" : "bg-white ring-1 ring-current/20"
              }`}
            >
              {st.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <div className="min-w-0">
              <p className={`text-sm ${st.done || now ? "font-bold" : "text-white/70"}`}>
                {st.label}
                <span className="sr-only">{st.done ? " (done)" : now ? " (current step)" : " (not yet)"}</span>
              </p>
              {st.done && st.date && <p className="text-xs tabular-nums text-white/70">{fmt(st.date)}</p>}
              {now && st.hint && <p className="mt-0.5 text-xs text-white/70">{st.hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Label/value pair for detail grids. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{label}</dt>
      <dd className="break-words text-sm font-semibold">{children || "—"}</dd>
    </div>
  );
}
