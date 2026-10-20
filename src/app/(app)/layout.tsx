import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { Sidebar } from "@/components/sidebar";
import { LanguageToggle } from "@/components/language-toggle";
import { TopbarSearch, QuickCreate } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("settings").select("company_name, company_name_ja, logo_url").single();
  const companyName =
    (locale === "ja" && settings?.company_name_ja) || settings?.company_name || "Al Mashriq";

  return (
    <div className="app-bg min-h-screen">
      <Sidebar
        role={profile.role}
        name={profile.full_name || profile.email}
        email={profile.email}
        companyName={companyName}
        logoUrl={settings?.logo_url}
      />
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/60 bg-white/70 pl-16 pr-4 backdrop-blur-xl lg:px-8">
          <TopbarSearch />
          <div className="ml-auto flex items-center gap-2.5">
            <QuickCreate role={profile.role} />
            <LanguageToggle locale={locale} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
