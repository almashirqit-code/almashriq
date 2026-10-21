import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Split, Trash2, FileText, X, Download, Banknote } from "lucide-react";
import { AllocationRowControls, UnallocateAllButton } from "./allocation-controls";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { date, money, vehicleTitle } from "@/lib/format";
import type { Remittance, RemittanceDocument } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, Stat, Badge, Empty } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { deleteRemittance, deleteDocument } from "../actions";
import { DocUploader } from "./doc-uploader";

const STATUS_BADGE: Record<string, string> = {
  unallocated: "bg-slate-100 text-slate-600 ring-slate-500/20",
  partial: "bg-amber-50 text-amber-700 ring-amber-600/20",
  allocated: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export default async function RemittancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const { data: remRow } = await supabase
    .from("remittances")
    .select("*, customers(id, customer_no, name, company, phone, email)")
    .eq("id", id)
    .maybeSingle();
  if (!remRow) notFound();
  const rem = remRow as Remittance & { customers: { id: string; customer_no: number; name: string; company: string | null; phone: string | null; email: string | null } | null };

  const [{ data: docs }, { data: allocs }] = await Promise.all([
    supabase.from("remittance_documents").select("*").eq("remittance_id", id).order("created_at"),
    supabase
      .from("remittance_allocations")
      .select("id, amount, created_at, vehicles(id, stock_no, chassis_no, make, model, grade, year), payments(id, amount, invoice_id, invoices(invoice_no, currency))")
      .eq("remittance_id", id)
      .order("created_at"),
  ]);

  // Signed thumbnails for image documents (5 minutes)
  const documents = (docs ?? []) as RemittanceDocument[];
  const imagePaths = documents.filter((d) => d.mime_type?.startsWith("image/")).map((d) => d.path);
  const signed = new Map<string, string>();
  if (imagePaths.length) {
    const { data: urls } = await supabase.storage.from("remittance-docs").createSignedUrls(imagePaths, 300);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }

  const canEdit = can.editStock(profile.role);
  const cur = rem.currency;
  type Alloc = {
    id: string;
    amount: number;
    created_at: string;
    vehicles: { id: string; stock_no: string; chassis_no: string | null; make: string; model: string; grade: string | null; year: number | null } | null;
    payments: { id: string; amount: number; invoice_id: string; invoices: { invoice_no: string; currency: "JPY" | "USD" | "EUR" | "GBP" } | null }[];
  };
  const allocations = (allocs ?? []) as unknown as Alloc[];

  return (
    <>
      <PageHeader
        icon={<Banknote />}
        tone="emerald"
        back={{ href: "/admin/remittances", label: t("rem_title") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t("rem_details")} #{rem.id}
            <Badge className={STATUS_BADGE[rem.status]}>{t(`rs_${rem.status}` as DictKey)}</Badge>
          </span>
        }
        subtitle={rem.customers ? `${rem.customers.customer_no} · ${rem.customers.name}` : undefined}
        actions={
          <>
            {canEdit && rem.remaining_amount > 0 && (
              <Link href={`/admin/remittances/${id}/allocate`} className="btn-primary">
                <Split className="h-4 w-4" />
                {t("rem_allocate")}
              </Link>
            )}
            {canEdit && allocations.length > 0 && <UnallocateAllButton remittanceId={id} count={allocations.length} />}
            {canEdit && (
              <Link href={`/admin/remittances/${id}/edit`} className="btn-secondary">
                <Pencil className="h-4 w-4" />
                {t("edit")}
              </Link>
            )}
            {profile.role === "admin" && (
              <ConfirmButton action={deleteRemittance.bind(null, id)}>
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </ConfirmButton>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="violet" label={t("rem_instructed")} value={money(rem.instructed_amount, cur, locale)} />
        <Stat tone="sky" label={t("rem_remit_amount")} value={money(rem.remit_amount, cur, locale)} hint={`${t("rem_bank_charges")}: ${money(rem.bank_charges, cur, locale)}`} />
        <Stat tone="emerald" label={t("rem_allocated_amount")} value={money(rem.allocated_amount, cur, locale)} />
        <Stat
          tone={rem.remaining_amount > 0 ? "amber" : "emerald"}
          label={t("rem_remaining")}
          value={<span className={rem.remaining_amount > 0 ? "text-red-600" : "text-emerald-600"}>{money(rem.remaining_amount, cur, locale)}</span>}
          hint={`≈ ${money(rem.remaining_amount * (cur === "JPY" ? 1 : Number(rem.exchange_rate)), "JPY", locale)}`}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="card xl:col-span-1">
          <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">{t("rem_remittance_details")}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-5 text-sm">
            {(
              [
                ["rem_customer", rem.customers ? `${rem.customers.customer_no} · ${rem.customers.name}` : "—"],
                ["rem_office", rem.office],
                ["rem_shift", rem.shift],
                ["rem_currency", cur],
                ["rem_exchange_rate", `1 ${cur} = ${Number(rem.exchange_rate)} JPY`],
                ["rem_remitter", rem.remitter],
                ["rem_bank", rem.bank],
                ["rem_bank_address", rem.bank_address],
                ["rem_bank_phone", rem.bank_phone],
                ["rem_remit_date", date(rem.remit_date, locale)],
                ["rem_received_date", date(rem.received_date, locale)],
                ["rem_remarks", rem.remarks],
              ] as [DictKey, string | null][]
            ).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-500">{t(k)}</dt>
                <dd className="break-words font-medium text-slate-800">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-5 xl:col-span-2">
          <section className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold">
                {t("rem_documents")} <span className="text-slate-400">({documents.length})</span>
              </h2>
              {canEdit && <DocUploader remittanceId={id} />}
            </div>
            {documents.length === 0 ? (
              <Empty>{t("rem_no_files")}</Empty>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
                {documents.map((d) => {
                  const thumb = signed.get(d.path);
                  return (
                    <div key={d.id} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <a href={`/admin/remittances/docs/${d.id}`} target="_blank" rel="noreferrer" className="block">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={d.file_name} className="aspect-[3/4] w-full object-cover" />
                        ) : (
                          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 text-red-600">
                            <FileText className="h-10 w-10" />
                            <span className="text-xs font-semibold">PDF</span>
                          </div>
                        )}
                        <div className="truncate border-t border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600" title={d.file_name}>
                          {d.file_name}
                        </div>
                      </a>
                      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                        <a
                          href={`/admin/remittances/docs/${d.id}?download=1`}
                          className="rounded bg-white/90 p-1 text-slate-700 shadow"
                          title={t("download")}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {canEdit && (
                          <ConfirmButton
                            action={deleteDocument.bind(null, d.id, id)}
                            className="rounded bg-white/90 p-1 text-red-600 shadow"
                          >
                            <X className="h-3.5 w-3.5" />
                          </ConfirmButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <h2 id="allocations" className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold">
              {t("rem_allocations")} <span className="text-slate-400">({allocations.length})</span>
            </h2>
            {allocations.length === 0 ? (
              <Empty>{t("no_results")}</Empty>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("rem_stock_id")}</th>
                    <th>{t("stock_details")}</th>
                    <th>{t("inv_title")}</th>
                    <th className="text-right">{t("amount")}</th>
                    <th className="text-right">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => {
                    const pay = a.payments?.[0];
                    return (
                      <tr key={a.id}>
                        <td>
                          {a.vehicles && (
                            <Link href={`/admin/stock/${a.vehicles.id}`} className="font-medium text-brand-700 hover:underline">
                              {a.vehicles.stock_no}
                            </Link>
                          )}
                          <div className="font-mono text-xs text-slate-500">{a.vehicles?.chassis_no}</div>
                        </td>
                        <td>{a.vehicles ? vehicleTitle(a.vehicles) : "—"}</td>
                        <td className="text-xs">
                          {pay?.invoices ? (
                            <Link href={`/admin/invoices/${pay.invoice_id}`} className="text-brand-700 hover:underline">
                              {t("rem_invoice_payment", { invoice: pay.invoices.invoice_no })} ({money(pay.amount, pay.invoices.currency, locale)})
                            </Link>
                          ) : (
                            <span className="text-slate-500">{t("rem_no_invoice")}</span>
                          )}
                        </td>
                        <AllocationRowControls
                          allocationId={a.id}
                          remittanceId={id}
                          amount={Number(a.amount)}
                          maxAmount={Number(a.amount) + Number(rem.remaining_amount)}
                          amountLabel={money(a.amount, cur, locale)}
                          stockNo={a.vehicles?.stock_no ?? ""}
                          canEdit={canEdit}
                        />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
