import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { Sidebar } from "@/components/sidebar";
import { LanguageToggle } from "@/components/language-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("settings").select("company_name, company_name_ja, logo_url").single();
  const companyName =
    (locale === "ja" && settings?.company_name_ja) || settings?.company_name || "Al Mashriq";

  return (
    <div className="min-h-screen">
      <Sidebar
        role={profile.role}
        name={profile.full_name || profile.email}
        email={profile.email}
        companyName={companyName}
        logoUrl={settings?.logo_url}
      />
      <div className="lg:pl-60">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-end gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-8">
          <LanguageToggle locale={locale} />
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
