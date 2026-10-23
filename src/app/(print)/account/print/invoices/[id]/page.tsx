import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PrintButton } from "@/components/buttons";
import { verifyQrSvg } from "@/lib/verify-qr";
import { requireActivePortal, getPortalInvoiceDoc, getInvoiceLetterhead } from "@/lib/portal";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

/** Customer's printable invoice — the same A4 document staff print, outside the website chrome. */
export default async function PrintAccountInvoice({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  await requireActivePortal();
  const { id } = await params;
  const lang = (await searchParams).lang === "ja" ? "ja" : "en";
  const [doc, settings] = await Promise.all([getPortalInvoiceDoc(id), getInvoiceLetterhead()]);
  if (!doc) notFound();
  const qr = await verifyQrSvg(doc.invoice.verify_token);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4">
        <PrintButton>Print / save as PDF</PrintButton>
      </div>
      <div className="mx-auto max-w-[210mm] shadow-lg print:max-w-none print:shadow-none">
        <InvoiceDocument invoice={doc.invoice} items={doc.items} customer={doc.customer} settings={settings} lang={lang} qr={qr} />
      </div>
    </div>
  );
}
