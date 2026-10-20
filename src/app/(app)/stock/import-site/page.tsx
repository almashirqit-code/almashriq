import { Globe } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SiteImporter } from "./site-importer";

export const metadata = { title: "Import from website" };

export default async function ImportSitePage() {
  await requireRole(["admin", "manager"]);
  return (
    <>
      <PageHeader icon={<Globe />} tone="sky" title="Import from website" subtitle="Bring the cars listed on almashriqtrading.site into the ERP" back={{ href: "/stock", label: "Stock" }} />
      <SiteImporter />
    </>
  );
}
