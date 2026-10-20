import { Upload } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { Importer } from "./importer";

export default async function ImportPage() {
  await requireRole(["admin", "manager"]);
  const { t } = await getT();
  return (
    <>
      <PageHeader icon={<Upload />} tone="amber" title={t("import_title")} subtitle={t("import_intro")} back={{ href: "/stock", label: t("stock_title") }} />
      <Importer />
    </>
  );
}
