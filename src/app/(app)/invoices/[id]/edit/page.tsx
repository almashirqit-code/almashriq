import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import type { Invoice, InvoiceItem } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { InvoiceEditor } from "../../invoice-editor";
import { loadEditorData } from "../../data";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: inv }, { data: items }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order"),
  ]);
  if (!inv) notFound();
  const invoice = inv as Invoice;
  if (invoice.status !== "draft") redirect(`/invoices/${id}`);
  const lines = (items ?? []) as InvoiceItem[];
  const data = await loadEditorData(lines.map((l) => l.vehicle_id).filter(Boolean) as string[]);

  return (
    <>
      <PageHeader title={`${t("inv_edit")} — ${invoice.invoice_no}`} back={{ href: `/invoices/${id}`, label: invoice.invoice_no }} />
      <InvoiceEditor
        {...data}
        initial={{
          id,
          customer_id: invoice.customer_id,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          currency: invoice.currency,
          exchange_rate: Number(invoice.exchange_rate),
          incoterm: invoice.incoterm,
          port_of_loading: invoice.port_of_loading,
          port_of_discharge: invoice.port_of_discharge,
          notes: invoice.notes,
          discount: Number(invoice.discount),
          tax_rate: Number(invoice.tax_rate),
          items: lines.map((l) => ({
            vehicle_id: l.vehicle_id,
            description: l.description,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
          })),
        }}
      />
    </>
  );
}
