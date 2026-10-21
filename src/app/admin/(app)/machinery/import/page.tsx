import { Upload } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { MachineryImporter } from "./machinery-importer";

export const metadata = { title: "Import machinery" };

export default async function MachineryImportPage() {
  await requireRole(["admin", "manager"]);
  return (
    <>
      <PageHeader
        icon={<Upload />}
        tone="amber"
        title="Bulk import machinery"
        subtitle="Upload a CSV / Excel file or paste rows, and/or a ZIP of photos. Rows and photos are matched on Stock no."
        back={{ href: "/admin/machinery", label: "Machinery" }}
      />
      <MachineryImporter />
    </>
  );
}
