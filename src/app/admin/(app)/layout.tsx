import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { Sidebar } from "@/components/sidebar";
import { LanguageToggle } from "@/components/language-toggle";
import { TopbarSearch, QuickCreate } from "@/components/topbar";
import { WorldClock } from "@/components/world-clock";
import { FxBadge } from "@/components/fx-badge";
import { getUsdJpy } from "@/lib/fx";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  const locale = await getLocale();
  const supabase = await createClient();
  const canApprove = profile.role === "admin" || profile.role === "manager";
  const [fx, { data: settings }, { count: pendingSignups }, { count: unreadChats }, { count: waitingSlips }] = await Promise.all([
    getUsdJpy(),
    supabase.from("settings").select("company_name, company_name_ja, logo_url").single(),
    // New website sign-ups waiting for an admin/manager to link them and assign an agent.
    canApprove
      ? supabase.from("portal_accounts").select("user_id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    // Open chats waiting for a staff reply that this user can see (RLS).
    supabase.from("support_threads").select("id", { count: "exact", head: true }).eq("status", "open").gt("staff_unread", 0),
    // Payment slips customers uploaded, waiting for an admin/manager to check (RLS: customers they can see).
    canApprove
      ? supabase.from("payment_slips").select("id", { count: "exact", head: true }).eq("status", "submitted")
      : Promise.resolve({ count: 0 }),
  ]);
  const companyName =
    (locale === "ja" && settings?.company_name_ja) || settings?.company_name || "Al Mashriq";

  return (
    <div className="app-bg min-h-screen">
      <Sidebar
        role={profile.role}
        name={profile.full_name || profile.email}
        email={profile.email}
        office={[profile.office, profile.shift].filter(Boolean).join(" · ") || null}
        companyName={companyName}
        logoUrl={settings?.logo_url}
        userId={profile.id}
        avatarUrl={profile.avatar_url ?? null}
        badges={{ "/admin/portal-signups": pendingSignups ?? 0, "/admin/support": unreadChats ?? 0, "/admin/payment-slips": waitingSlips ?? 0 }}
      />
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/60 bg-white/70 pl-16 pr-4 backdrop-blur-xl lg:px-8">
          <TopbarSearch />
          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden items-center gap-3 rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200 xl:flex">
              <WorldClock serverNow={Date.now()} labelClass="text-slate-400" timeClass="font-semibold text-slate-800" />
              <FxBadge fx={fx} showMillion className="border-l border-slate-200 pl-3 [&_b]:text-slate-900" />
            </div>
            <QuickCreate role={profile.role} />
            <LanguageToggle locale={locale} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
