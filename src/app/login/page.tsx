import { getT } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";
import { LanguageToggle } from "@/components/language-toggle";
import { Car } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string }>;
}) {
  const { t, locale } = await getT();
  const { disabled } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 p-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle locale={locale} dark />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Car className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">{t("app_name")}</span>
        </div>
        <div className="card p-6">
          <h1 className="mb-5 text-lg font-semibold">{t("login_title")}</h1>
          {disabled && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t("account_disabled")}</p>
          )}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
