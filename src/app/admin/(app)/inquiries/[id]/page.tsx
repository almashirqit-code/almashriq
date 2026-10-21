import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox, Mail, Phone, MessageCircle, UserPlus, Trash2, Car, MapPin, ExternalLink, BookmarkPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { loadStaff } from "../../customers/staff";
import { AssignSelect, NotesBox, StatusButtons } from "../inquiry-controls";
import { INQ_LABEL, INQ_STYLE } from "../status";
import { deleteInquiry, inquiryToCustomer } from "../actions";

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getProfile();
  const supabase = await createClient();
  const { data: q } = await supabase.from("inquiries").select("*, vehicles(id, stock_no, make, model, year, status), customers(id, name)").eq("id", id).maybeSingle();
  if (!q) notFound();
  const staff = me.role === "sales" ? [] : await loadStaff();
  const v = q.vehicles as { id: string; stock_no: string; make: string; model: string; year: number | null; status: string } | null;
  const cust = q.customers as { id: string; name: string } | null;
  const wa = q.phone ? `https://wa.me/${String(q.phone).replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hello ${q.name}, thank you for your inquiry${q.stock_no ? ` about ${q.stock_no}` : ""} at Al Mashriq Trading.`)}` : null;

  return (
    <>
      <PageHeader
        icon={<Inbox />}
        tone="fuchsia"
        back={{ href: "/admin/inquiries", label: "Inquiries" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Inquiry #{q.inquiry_no}
            <Badge className={INQ_STYLE[q.status]}>{INQ_LABEL[q.status]}</Badge>
          </span>
        }
        subtitle={`${new Date(q.created_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })} · ${q.source}`}
        actions={
          <>
            {cust ? (
              <Link href={`/admin/customers/${cust.id}`} className="btn-secondary">
                <UserPlus className="h-4 w-4" />
                {cust.name}
              </Link>
            ) : (
              <ConfirmButton action={inquiryToCustomer.bind(null, q.id)} className="btn-primary" message={`Create a customer from ${q.name}?`}>
                <UserPlus className="h-4 w-4" />
                Create customer
              </ConfirmButton>
            )}
            {cust && v && v.status === "in_stock" && (
              <Link href={`/admin/reservations/new?vehicle=${v.id}`} className="btn bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                <BookmarkPlus className="h-4 w-4" />
                Reserve {v.stock_no}
              </Link>
            )}
            {can.deleteRecords(me.role) && (
              <ConfirmButton action={deleteInquiry.bind(null, q.id)}>
                <Trash2 className="h-4 w-4" />
              </ConfirmButton>
            )}
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5">
            <h2 className="card-title mb-3">Message</h2>
            <p className="whitespace-pre-line text-sm text-slate-700">{q.message || "—"}</p>
            {v && (
              <Link href={`/admin/stock/${v.id}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-rose-200">
                <Car className="h-4 w-4" />
                {v.stock_no} · {[v.year, v.make, v.model].filter(Boolean).join(" ")} · {v.status.replace("_", " ")}
              </Link>
            )}
            {!v && q.stock_no && <p className="mt-3 text-xs text-slate-500">Car asked about: {q.stock_no}</p>}
            {q.page_url && (
              <a href={q.page_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                <ExternalLink className="h-3 w-3" />
                {q.page_url}
              </a>
            )}
          </section>
          <section className="card p-5">
            <h2 className="card-title mb-3">Status</h2>
            <StatusButtons id={q.id} value={q.status} />
            <h2 className="card-title mb-3 mt-5">Notes</h2>
            <NotesBox id={q.id} value={q.notes} />
          </section>
        </div>
        <aside className="space-y-5">
          <section className="card p-5 text-sm">
            <h2 className="card-title mb-3">{q.name}</h2>
            <div className="space-y-2 text-slate-700">
              {(q.country || q.port) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-500" />
                  {[q.port, q.country].filter(Boolean).join(", ")}
                </div>
              )}
              {q.email && (
                <a href={`mailto:${q.email}?subject=${encodeURIComponent(`Your inquiry${q.stock_no ? ` about ${q.stock_no}` : ""} — Al Mashriq Trading`)}`} className="flex items-center gap-2 hover:text-brand-700">
                  <Mail className="h-4 w-4 text-rose-500" />
                  {q.email}
                </a>
              )}
              {q.phone && (
                <a href={`tel:${q.phone}`} className="flex items-center gap-2 hover:text-brand-700">
                  <Phone className="h-4 w-4 text-rose-500" />
                  {q.phone}
                </a>
              )}
            </div>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 font-bold text-white hover:bg-emerald-600">
                <MessageCircle className="h-4 w-4" />
                Reply on WhatsApp
              </a>
            )}
          </section>
          {me.role !== "sales" && (
            <section className="card p-5">
              <h2 className="card-title mb-3">Assigned agent</h2>
              <AssignSelect id={q.id} value={q.assigned_to} staff={staff} />
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
