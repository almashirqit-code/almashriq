import { UserCog } from "lucide-react";
import { avatarSrc } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { date } from "@/lib/format";
import type { Profile } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, Badge } from "@/components/ui";
import { NewUserForm } from "./new-user-form";
import { UserRowActions } from "./user-row-actions";
import { OfficeShiftPicker } from "./office-shift-picker";
import { StaffContact } from "./staff-contact";

export default async function UsersPage() {
  const me = await requireRole(["admin"]);
  const { t, locale } = await getT();
  const supabase = await createClient();
  const [{ data }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("settings").select("offices, shifts").single(),
  ]);
  const offices = (settings?.offices ?? []) as string[];
  const shifts = (settings?.shifts ?? []) as string[];
  const users = (data ?? []) as Profile[];
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <>
      <PageHeader icon={<UserCog />} tone="violet" title={t("users_title")} />
      {!hasServiceKey && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("users_service_key_missing")}</p>
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("users_full_name")}</th>
                  <th>{t("role")}</th>
                  <th>
                    {t("rem_office")} / {t("rem_shift")}
                  </th>
                  <th>{t("status")}</th>
                  <th className="text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarSrc(u.avatar_url, u.full_name || u.email)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                      <div>
                      <div className="font-medium">
                        {u.full_name || "—"}
                        {u.id === me.id && <span className="ml-2 text-xs text-slate-400">({t("users_self")})</span>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {u.email} · {date(u.created_at, locale)}
                      </div>
                      </div>
                      </div>
                    </td>
                    <td>{t(`role_${u.role}` as DictKey)}</td>
                    <td>
                      <OfficeShiftPicker userId={u.id} office={u.office} shift={u.shift} offices={offices} shifts={shifts} />
                      <StaffContact userId={u.id} phone={u.phone ?? null} whatsapp={u.whatsapp ?? null} />
                    </td>
                    <td>
                      {u.active ? (
                        <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">{t("users_active")}</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 ring-slate-500/20">{t("users_disabled")}</Badge>
                      )}
                    </td>
                    <td>{hasServiceKey && <UserRowActions id={u.id} role={u.role} active={u.active} isSelf={u.id === me.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {hasServiceKey && <NewUserForm offices={offices} shifts={shifts} />}
      </div>
    </>
  );
}
