import { UserCog, AlertTriangle, Mail } from "lucide-react";
import { avatarSrc } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { date, num } from "@/lib/format";
import type { Profile } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, Badge, Stat } from "@/components/ui";
import { NewUserForm } from "./new-user-form";
import { UserRowActions } from "./user-row-actions";
import { OfficeShiftPicker } from "./office-shift-picker";
import { StaffContact } from "./staff-contact";

const ROLE_STYLE: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700 ring-violet-600/20",
  manager: "bg-sky-50 text-sky-700 ring-sky-600/20",
  sales: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

/** Staff list: one card per person (who, office/shift, contact, role and access). */
export default async function UsersPage() {
  const me = await requireRole(["admin"]);
  const { t, locale } = await getT();
  const supabase = await createClient();
  const [{ data }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("*").order("active", { ascending: false }).order("created_at"),
    supabase.from("settings").select("offices, shifts").single(),
  ]);
  const offices = (settings?.offices ?? []) as string[];
  const shifts = (settings?.shifts ?? []) as string[];
  const users = (data ?? []) as Profile[];
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const active = users.filter((u) => u.active);
  const noWhatsapp = active.filter((u) => !u.whatsapp?.trim());

  return (
    <>
      <PageHeader icon={<UserCog />} tone="violet" title={t("users_title")} />
      {!hasServiceKey && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("users_service_key_missing")}</p>}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="violet" label={t("users_total")} value={num(users.length)} />
        <Stat tone="emerald" label={t("users_active")} value={num(active.length)} />
        <Stat tone="amber" label={t("users_whatsapp_missing")} value={num(noWhatsapp.length)} />
      </div>

      {noWhatsapp.length > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {t("users_whatsapp_banner", { count: noWhatsapp.length })} {t("users_whatsapp_help")}
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id} className={`card p-4 sm:p-5 ${u.active ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarSrc(u.avatar_url, u.full_name || u.email)} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">{u.full_name || "—"}</span>
                      {u.id === me.id && <span className="text-xs text-slate-400">({t("users_self")})</span>}
                      <Badge className={ROLE_STYLE[u.role] ?? ROLE_STYLE.sales}>{t(`role_${u.role}` as DictKey)}</Badge>
                      {u.active ? (
                        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">{t("users_active")}</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 ring-slate-500/20">{t("users_disabled")}</Badge>
                      )}
                      {u.active && !u.whatsapp?.trim() && <Badge className="bg-red-50 text-red-700 ring-red-600/20">{t("users_whatsapp_missing")}</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                      <span className="inline-flex min-w-0 items-center gap-1 break-all">
                        <Mail className="h-3 w-3 shrink-0" /> {u.email}
                      </span>
                      <span>{t("users_joined", { date: date(u.created_at, locale) })}</span>
                    </div>
                  </div>
                </div>
                {hasServiceKey && <UserRowActions id={u.id} role={u.role} active={u.active} isSelf={u.id === me.id} />}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[auto_minmax(0,1fr)]">
                <div>
                  <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t("rem_office")} / {t("rem_shift")}
                  </div>
                  <OfficeShiftPicker userId={u.id} office={u.office} shift={u.shift} offices={offices} shifts={shifts} />
                </div>
                <StaffContact userId={u.id} phone={u.phone ?? null} whatsapp={u.whatsapp ?? null} />
              </div>
            </li>
          ))}
        </ul>
        {hasServiceKey && (
          <div className="xl:sticky xl:top-20">
            <NewUserForm offices={offices} shifts={shifts} />
          </div>
        )}
      </div>
    </>
  );
}
