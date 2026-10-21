import { getT } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  const { t, locale } = await getT();
  const { disabled } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-jet-950 p-4">
      {/* Brand speed lines */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full border-[28px] border-brand-500/20" />
        <div className="absolute -right-24 -top-24 h-[20rem] w-[20rem] rounded-full border-[10px] border-white/5" />
        <div className="absolute bottom-24 left-0 h-[3px] w-1/2 bg-gradient-to-r from-transparent via-cerulean-400/70 to-transparent" />
        <div className="absolute bottom-20 left-0 h-[2px] w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <div className="absolute right-4 top-4">
        <LanguageToggle locale={locale} dark />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center">
          <Logo size="lg" />
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">ERP</div>
        </div>
        <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex h-1">
            <div className="w-2/3 bg-cerulean-600" />
            <div className="w-1/3 bg-brand-500" />
          </div>
          <div className="p-6">
            <h1 className="mb-5 text-lg font-semibold">{t("login_title")}</h1>
            {disabled && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("account_disabled")}</p>
            )}
            <LoginForm />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">AL MASHRIQ TRADING CO., LTD. · Japan</p>
      </div>
    </main>
  );
}
