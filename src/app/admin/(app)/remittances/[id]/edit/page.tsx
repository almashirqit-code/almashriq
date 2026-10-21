import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import type { Remittance } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { RemittanceForm } from "../../remittance-form";
import { loadFormData } from "../../data";

export default async function EditRemittancePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "manager"]);
  const { id } = await params;
  const { t } = await getT();
  const supabase = await createClient();
  const { data: rem } = await supabase.from("remittances").select("*").eq("id", Number(id)).maybeSingle();
  if (!rem) notFound();
  const data = await loadFormData();
  return (
    <>
      <PageHeader title={`${t("rem_edit")} #${id}`} back={{ href: `/admin/remittances/${id}`, label: `#${id}` }} />
      <RemittanceForm {...data} initial={rem as Remittance} />
    </>
  );
}
