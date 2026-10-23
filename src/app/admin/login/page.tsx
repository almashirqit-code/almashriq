import { getT } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Sign in" };

/** Staff sign-in — same light look as the website: black top bar, light page, white card, logo red. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  const { t, locale } = await getT();
  const { disabled } = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-col bg-[#f5f6f8]">
      <header className="flex items-center justify-between bg-jet-950 px-4 py-2.5">
        <Logo size="sm" />
        <LanguageToggle locale={locale} dark />
      </header>
      <div className="h-0.5 bg-gradient-to-r from-brand-600 via-brand-500/60 to-transparent" />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        {/* soft brand glows, like the website */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-brand-600/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full bg-cerulean-600/[0.07] blur-3xl" />

        <div className="relative w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center">
            <Logo tone="light" size="lg" />
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">ERP · Staff sign-in</div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04),0_16px_40px_-16px_rgb(15_23_42/0.25)]">
            <div className="h-1 bg-brand-600" />
            <div className="p-6">
              <h1 className="mb-5 text-lg font-bold text-jet-950">{t("login_title")}</h1>
              {disabled && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("account_disabled")}</p>}
              <LoginForm />
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">AL MASHRIQ TRADING CO., LTD. · Japan</p>
        </div>
      </div>
    </main>
  );
}
