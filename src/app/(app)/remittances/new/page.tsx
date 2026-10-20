import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { RemittanceForm } from "../remittance-form";
import { loadFormData } from "../data";

export default async function NewRemittancePage() {
  await requireRole(["admin", "manager"]);
  const { t } = await getT();
  const data = await loadFormData();
  return (
    <>
      <PageHeader title={t("rem_add")} back={{ href: "/remittances", label: t("rem_title") }} />
      <RemittanceForm {...data} />
    </>
  );
}
