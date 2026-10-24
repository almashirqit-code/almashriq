import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2, Pencil, Mail, Phone, MessageCircle, MapPin, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, date } from "@/lib/format";
import type { Currency, Customer, Invoice } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, InvoiceStatusBadge, Empty } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { deleteCustomer } from "../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const [{ data: customer }, { data: invoices }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("invoices").select("*").eq("customer_id", id).order("issue_date", { ascending: false }),
  ]);
  if (!customer) notFound();
  const { data: tagged } = (customer as Customer).assigned_to
    ? await supabase.from("profiles").select("full_name, email").eq("id", (customer as Customer).assigned_to!).maybeSingle()
    : { data: null };
  const c = customer as Customer;
  const list = (invoices ?? []) as Invoice[];

  const balances = new Map<Currency, number>();
  for (const inv of list) {
    if (inv.status === "issued" || inv.status === "partially_paid") {
      balances.set(inv.currency, (balances.get(inv.currency) ?? 0) + Number(inv.total) - Number(inv.amount_paid));
    }
  }

  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: t("cust_title") }}
        title={`${c.customer_no ? c.customer_no + " · " : ""}${c.name}`}
        subtitle={[c.company, c.country].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link href={`/admin/customers/${c.id}/edit`} className="btn-secondary">
              <Pencil className="h-4 w-4" />
              {t("edit")}
            </Link>
            <Link href={`/admin/support?filter=open&customer=${c.id}`} className="btn-secondary">
              <MessagesSquare className="h-4 w-4" />
              {t("nav_support")}
            </Link>
            <Link href={`/admin/invoices/new?customer=${c.id}`} className="btn-primary">
              <Plus className="h-4 w-4" />
              {t("inv_new")}
            </Link>
            {can.deleteRecords(profile.role) && (
              <ConfirmButton action={deleteCustomer.bind(null, c.id)}>
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </ConfirmButton>
            )}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <section className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold">{t("rem_customer_details")}</h2>
              <Link href={`/admin/customers/${c.id}/edit`} className="btn-ghost py-1 text-xs">
                <Pencil className="h-3.5 w-3.5" />
                {t("edit")}
              </Link>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 p-5 text-sm">
              {(
                [
                  ["c_customer_no", c.customer_no ? String(c.customer_no) : null],
                  ["c_name", c.name],
                  ["c_company", c.company],
                  ["c_email", c.email],
                  ["c_phone", c.phone],
                  ["c_whatsapp", c.whatsapp],
                  ["c_country", c.country],
                  ["c_port", c.port],
                  ["c_address", c.address],
                  ["c_assigned_to", tagged ? tagged.full_name || tagged.email : null],
                  ["notes", c.notes],
                ] as [DictKey, string | null][]
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-500">{t(k)}</dt>
                  <dd className="whitespace-pre-line break-words font-medium text-slate-800">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {(c.email || c.phone || c.whatsapp) && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="btn-secondary py-1.5 text-xs">
                    <Mail className="h-3.5 w-3.5" />
                    {t("c_email")}
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="btn-secondary py-1.5 text-xs">
                    <Phone className="h-3.5 w-3.5" />
                    {t("c_phone")}
                  </a>
                )}
                {(c.whatsapp || c.phone) && (
                  <a
                    href={`https://wa.me/${(c.whatsapp || c.phone || "").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary py-1.5 text-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("cust_consignee")}</h2>
            {c.consignee_name || c.consignee_address || c.notify_party ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 p-5 text-sm">
                {(
                  [
                    ["c_consignee_name", c.consignee_name],
                    ["c_consignee_address", c.consignee_address],
                    ["c_consignee_phone", c.consignee_phone],
                    ["c_consignee_email", c.consignee_email],
                    ["c_notify_party", c.notify_party],
                  ] as [DictKey, string | null][]
                ).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-slate-500">{t(k)}</dt>
                    <dd className="whitespace-pre-line break-words font-medium text-slate-800">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="flex items-center justify-between gap-3 px-5 py-4 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("cust_consignee_help")}
                </span>
                <Link href={`/admin/customers/${c.id}/edit`} className="text-brand-700 hover:underline">
                  {t("add")}
                </Link>
              </div>
            )}
          </section>
        </div>
        <section className="card overflow-hidden self-start">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{t("cust_invoices")}</h2>
            {balances.size > 0 && (
              <div className="text-right text-sm">
                <span className="text-slate-500">{t("cust_balance")}: </span>
                {[...balances.entries()].map(([cur, v]) => (
                  <span key={cur} className="ml-2 font-semibold text-red-600">
                    {money(v, cur, locale)}
                  </span>
                ))}
              </div>
            )}
          </div>
          {list.length === 0 ? (
            <Empty>{t("no_results")}</Empty>
          ) : (
            <table className="table">
              <tbody>
                {list.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
                        {inv.invoice_no}
                      </Link>
                      <div className="text-xs text-slate-500">{date(inv.issue_date, locale)}</div>
                    </td>
                    <td className="text-right tabular-nums">{money(inv.total, inv.currency, locale)}</td>
                    <td className="text-right">
                      <InvoiceStatusBadge status={inv.status} label={t(`is_${inv.status}` as DictKey)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
