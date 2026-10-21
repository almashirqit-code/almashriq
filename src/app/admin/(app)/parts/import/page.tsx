import { Upload } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PartsImporter } from "./parts-importer";

export const metadata = { title: "Import parts" };

export default async function PartsImportPage() {
  await requireRole(["admin", "manager"]);
  return (
    <>
      <PageHeader
        icon={<Upload />}
        tone="cyan"
        title="Bulk import parts"
        subtitle="Upload a CSV / Excel file or paste rows copied from a spreadsheet. Rows are matched on Part no."
        back={{ href: "/admin/parts", label: "Parts" }}
      />
      <PartsImporter />
    </>
  );
}
