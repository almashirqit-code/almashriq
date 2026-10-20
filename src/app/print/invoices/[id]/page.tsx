import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import type { Customer, Invoice, Settings } from "@/lib/types";
import { InvoiceDocument, INVOICE_ITEM_SELECT, type InvoiceItemWithVehicle } from "@/components/invoice-document";
import { PrintButton } from "@/components/buttons";
import { translate } from "@/lib/i18n/dictionaries";

export default async function PrintInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  await getProfile();
  const { id } = await params;
  const lang = (await searchParams).lang === "ja" ? "ja" : "en";
  const supabase = await createClient();

  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const invoice = inv as Invoice;
  const [{ data: items }, { data: customer }, { data: settings }] = await Promise.all([
    supabase.from("invoice_items").select(INVOICE_ITEM_SELECT).eq("invoice_id", id).order("sort_order"),
    supabase.from("customers").select("*").eq("id", invoice.customer_id).maybeSingle(),
    supabase.from("settings").select("*").single(),
  ]);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2">
        <PrintButton>{translate(lang, "print")}</PrintButton>
      </div>
      <div className="mx-auto max-w-[210mm] shadow-lg print:max-w-none print:shadow-none">
        <InvoiceDocument
          invoice={invoice}
          items={(items ?? []) as unknown as InvoiceItemWithVehicle[]}
          customer={customer as Customer | null}
          settings={settings as Settings | null}
          lang={lang}
        />
      </div>
    </div>
  );
}
