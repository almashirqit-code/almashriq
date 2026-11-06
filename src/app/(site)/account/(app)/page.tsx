import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, ShieldAlert, MessageCircle, Car, Mail, Send, MessagesSquare, Upload, FileText, Ship, CheckCircle2, ChevronRight, Wallet } from "lucide-react";
import { getCompany, whatsapp } from "@/lib/public-site";
import { money, publicImageUrl } from "@/lib/format";
import {
  getPortalMe,
  getPortalStatement,
  getPortalInvoices,
  getPortalVehicles,
  getPortalReservations,
  getPortalTTs,
  getPortalSlips,
  closingBalances,
  fmtDate,
  isOverdue,
} from "@/lib/portal";
import { Card, Pill, SectionTitle, carJourney, currentStep, paidDates } from "./ui";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

const BTN = "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold";

export default async function AccountHome() {
  const [me, company] = await Promise.all([getPortalMe(), getCompany()]);
  const wa = whatsapp(company, "Hello Al Mashriq, I'm writing from my customer account.");
  const contact = (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {me && me.status !== "rejected" && (
        <>
          <Link href="/account/support" className="glass flex items-center gap-3 rounded-2xl p-4 font-bold hover:brightness-105">
            <MessagesSquare className="h-5 w-5 text-cerulean-600" /> Chat with support
          </Link>
          <Link href="/account/inquiries" className="glass flex items-center gap-3 rounded-2xl p-4 font-bold hover:brightness-105">
            <Send className="h-5 w-5 text-brand-600" /> Send an inquiry
          </Link>
        </>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener nofollow" className="glass flex items-center gap-3 rounded-2xl p-4 font-bold hover:brightness-105">
          <MessageCircle className="h-5 w-5 text-[#25D366]" /> Message us on WhatsApp
        </a>
      )}
      <Link href="/cars" className="glass flex items-center gap-3 rounded-2xl p-4 font-bold hover:brightness-105">
        <Car className="h-5 w-5 text-brand-600" /> Browse our stock
      </Link>
    </div>
  );

  if (me?.status !== "active") {
    return (
      <>
        {me?.status === "rejected" ? (
          <Card>
            <ShieldAlert className="mb-2 h-8 w-8 text-brand-600" />
            <h2 className="text-lg font-bold">We couldn&apos;t verify this account</h2>
            <p className="mt-1 text-sm text-white/70">Please contact us so we can help you get set up.</p>
          </Card>
        ) : (
          <Card>
            <Clock3 className="mb-2 h-8 w-8 text-amber-600" />
            <h2 className="text-lg font-bold">We&apos;re setting up your account</h2>
            <p className="mt-1 text-sm text-white/70">
              Our team will link your purchases to this login and assign your sales agent. Once that&apos;s done, your invoices, payments and shipments will appear here.
            </p>
          </Card>
        )}
        {contact}
      </>
    );
  }

  const [statement, invoices, vehicles, reservations, tts, slips] = await Promise.all([
    getPortalStatement(),
    getPortalInvoices(),
    getPortalVehicles(),
    getPortalReservations(),
    getPortalTTs(),
    getPortalSlips(),
  ]);
  const balances = [...closingBalances(statement).entries()].filter(([, v]) => v >= 0.005);
  const paid = paidDates(tts);
  const activeRes = reservations.filter((r) => r.status === "active");
  // Unpaid invoices, the one due soonest first.
  const unpaid = invoices
    .filter((i) => i.doc_type !== "quotation" && (i.status === "issued" || i.status === "partially_paid") && Number(i.total) - Number(i.amount_paid) > 0.005)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const checking = slips.filter((s) => s.status === "submitted");
  const onWay = vehicles.find((v) => v.shipping_status === "shipped");

  // The one thing to do or know next.
  const next = unpaid[0]
    ? {
        tone: "pay" as const,
        title: `Pay ${unpaid[0].invoice_no}: ${money(Number(unpaid[0].total) - Number(unpaid[0].amount_paid), unpaid[0].currency)}`,
        text: `${unpaid[0].due_date ? `${isOverdue(unpaid[0]) ? "Overdue since" : "Due"} ${fmtDate(unpaid[0].due_date)}. ` : ""}Pay only into the bank account printed on the invoice, then upload your slip so we can match it.`,
        actions: (
          <>
            <Link href="/account/payments" className={`${BTN} bg-white text-[var(--accent)] hover:brightness-95`}>
              <Upload className="h-4 w-4" /> Upload payment slip
            </Link>
            <Link href={`/account/invoices/${unpaid[0].id}`} className={`${BTN} ring-1 ring-white/40 hover:bg-white/10`}>
              <FileText className="h-4 w-4" /> View invoice
            </Link>
          </>
        ),
      }
    : checking.length
      ? { tone: "wait" as const, title: "We're checking your payment slip", text: "We match it with our bank, usually within 1–2 working days. It moves to Payments received once confirmed.", actions: null }
      : onWay
        ? {
            tone: "ship" as const,
            title: `Your ${[onWay.make, onWay.model].filter(Boolean).join(" ")} is on the way`,
            text: `${onWay.vessel_name ? `On ${onWay.vessel_name}. ` : ""}${onWay.eta ? `Arriving around ${fmtDate(onWay.eta)}.` : "We'll add the arrival date as soon as the shipping line confirms it."}`,
            actions: (
              <Link href="/account/cars" className={`${BTN} bg-white text-[var(--accent)] hover:brightness-95`}>
                <Ship className="h-4 w-4" /> Track and documents
              </Link>
            ),
          }
        : vehicles.length || activeRes.length
          ? { tone: "ok" as const, title: "Nothing needed from you right now", text: "We'll update this page at every step, and notify you if anything is needed.", actions: null }
          : {
              tone: "ok" as const,
              title: "Find your next car",
              text: "Reserve a car with your agent and you can follow payment, shipping and documents here.",
              actions: (
                <Link href="/cars" className={`${BTN} bg-white text-[var(--accent)] hover:brightness-95`}>
                  <Car className="h-4 w-4" /> Browse stock
                </Link>
              ),
            };
  const NextIcon = { pay: Wallet, wait: Clock3, ship: Ship, ok: CheckCircle2 }[next.tone];

  return (
    <>
      <section aria-labelledby="next-title" className="on-dark rounded-2xl bg-[var(--accent)] p-5 text-white sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <NextIcon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="next-title" className="text-xl font-black tabular-nums">
              {next.title}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-white/80">{next.text}</p>
            {next.actions && <div className="mt-4 flex flex-wrap gap-2">{next.actions}</div>}
          </div>
        </div>
        {(balances.length > 0 || unpaid.length > 1) && (
          <p className="mt-4 border-t border-white/15 pt-3 text-sm text-white/80">
            {balances.length > 0 && <>Total balance due: <b className="tabular-nums text-white">{balances.map(([c, v]) => money(v, c)).join(" · ")}</b>. </>}
            {unpaid.length > 1 && `${unpaid.length} invoices are open${unpaid.some(isOverdue) ? `, ${unpaid.filter(isOverdue).length} overdue` : ""}. `}
            <Link href="/account/statement" className="font-bold underline">
              View statement
            </Link>
          </p>
        )}
      </section>

      {vehicles.length > 0 && (
        <>
          <SectionTitle title="My cars" href="/account/cars" link="Track all" />
          <ul className="grid gap-3 md:grid-cols-2">
            {vehicles.slice(0, 6).map((v) => {
              const steps = carJourney(v, paid.get(v.stock_no));
              const cur = currentStep(steps);
              const doneCount = steps.filter((s) => s.done).length;
              return (
                <li key={v.id}>
                  <Link href={`/account/cars#car-${v.id}`} className="glass flex items-center gap-4 rounded-2xl p-3 hover:brightness-105">
                    <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-black/5">
                      {v.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={publicImageUrl(v.cover)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Car className="m-auto h-full w-7 opacity-40" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{[v.year, v.make, v.model].filter(Boolean).join(" ")}</span>
                      <span className="block text-sm text-white/70">{cur ? `Now: ${cur.label}` : "Arrived at your port"}</span>
                      <span className="mt-1.5 flex gap-1" aria-label={`Step ${doneCount} of ${steps.length}`}>
                        {steps.map((s) => (
                          <span key={s.label} className={`h-1.5 flex-1 rounded-full ${s.done ? "bg-[var(--accent)]" : "bg-black/10"}`} />
                        ))}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 opacity-50" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {activeRes.length > 0 && (
        <>
          <SectionTitle title="Reserved for you" href="/account/reservations" link="Reservations" />
          <ul className="grid gap-2">
            {activeRes.slice(0, 3).map((r) => (
              <li key={r.id} className="glass flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-5 py-3">
                <span className="font-bold">{[r.year, r.make, r.model].filter(Boolean).join(" ") || "Vehicle"}</span>
                <span className="text-sm text-white/70">{r.reserved_until ? `Held until ${fmtDate(r.reserved_until)}` : `Reservation #${r.reservation_no}`}</span>
                <span className="ml-auto">
                  <Pill cls="bg-amber-100 text-amber-900">Reserved</Pill>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {me.agent && (
        <>
          <SectionTitle title="Your sales agent" />
          <Card className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{me.agent.name}</div>
              <div className="text-sm text-white/70">Ask about prices, shipping or documents.</div>
            </div>
            <Link href="/account/support" className={`${BTN} bg-[var(--accent)] text-white hover:bg-brand-700`}>
              <MessagesSquare className="h-4 w-4" /> Message
            </Link>
            <a href={`mailto:${me.agent.email}`} className={`${BTN} glass hover:brightness-105`}>
              <Mail className="h-4 w-4" /> Email
            </a>
          </Card>
        </>
      )}
      {contact}
    </>
  );
}
