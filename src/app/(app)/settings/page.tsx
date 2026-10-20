import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { Settings } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireRole(["admin"]);
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").single();
  return (
    <>
      <PageHeader title={t("settings_title")} />
      <div className="max-w-4xl">
        <SettingsForm settings={data as Settings} />
      </div>
    </>
  );
}
