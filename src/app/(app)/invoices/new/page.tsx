import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { InvoiceEditor } from "../invoice-editor";
import { loadEditorData } from "../data";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { t } = await getT();
  const { customer } = await searchParams;
  const data = await loadEditorData();
  return (
    <>
      <PageHeader title={t("inv_new")} back={{ href: "/invoices", label: t("inv_title") }} />
      <InvoiceEditor {...data} initial={{ customer_id: customer ?? "" }} />
    </>
  );
}
