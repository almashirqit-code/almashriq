import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, date } from "@/lib/format";
import type { Currency, Customer, Invoice } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, InvoiceStatusBadge, Empty } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { CustomerForm } from "../customer-form";
import { updateCustomer, deleteCustomer } from "../actions";

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
        back={{ href: "/customers", label: t("cust_title") }}
        title={c.name}
        subtitle={[c.company, c.country].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link href={`/invoices/new?customer=${c.id}`} className="btn-primary">
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
        <CustomerForm customer={c} action={updateCustomer.bind(null, c.id)} />
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
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
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
