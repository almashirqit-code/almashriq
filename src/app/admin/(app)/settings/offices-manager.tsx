"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Clock, Pencil, Plus, Trash2, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { IconChip } from "@/components/ui";
import { addPlace, removePlace, renamePlace } from "./actions";

type Kind = "office" | "shift";

/** Offices and shifts: add, rename (everywhere it is used) and remove, with staff counts. */
export function OfficesManager({
  offices,
  shifts,
  staff,
  canEdit,
}: {
  offices: string[];
  shifts: string[];
  staff: { office: Record<string, number>; shift: Record<string, number> };
  canEdit: boolean;
}) {
  const { t } = useT();
  return (
    <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
      <PlaceList kind="office" title={t("office_title")} help={t("office_help")} addLabel={t("office_add")} items={offices} counts={staff.office} canEdit={canEdit} />
      <PlaceList kind="shift" title={t("shift_title")} help={null} addLabel={t("shift_add")} items={shifts} counts={staff.shift} canEdit={canEdit} />
    </div>
  );
}

function PlaceList({
  kind,
  title,
  help,
  addLabel,
  items,
  counts,
  canEdit,
}: {
  kind: Kind;
  title: string;
  help: string | null;
  addLabel: string;
  items: string[];
  counts: Record<string, number>;
  canEdit: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string; inUse?: number }>, done?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.inUse) return setError(t("office_in_use", { count: r.inUse }));
      if (r.error) return setError(r.error);
      done?.();
      router.refresh();
    });

  return (
    <section className="card">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5">
        <IconChip tone={kind === "office" ? "sky" : "slate"} size="sm">
          {kind === "office" ? <Building2 /> : <Clock />}
        </IconChip>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {help && <p className="mt-0.5 text-xs text-slate-500">{help}</p>}
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2 px-5 py-2.5 text-sm">
            {editing?.from === it ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => renamePlace(kind, it, editing.to), () => setEditing(null));
                }}
              >
                <input
                  autoFocus
                  value={editing.to}
                  maxLength={60}
                  aria-label={t("office_name")}
                  onChange={(e) => setEditing({ from: it, to: e.target.value })}
                  onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                  className="input py-1.5"
                />
                <button className="btn-secondary py-1.5 text-xs" disabled={pending || !editing.to.trim()} aria-label={t("save")}>
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setEditing(null)} aria-label={t("cancel")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <>
                <span className="flex-1 font-semibold text-slate-800">{it}</span>
                <span className="text-xs text-slate-500">{t("office_staff", { count: counts[it] ?? 0 })}</span>
                {canEdit && (
                  <>
                    <button type="button" className="btn-ghost p-1.5" disabled={pending} onClick={() => setEditing({ from: it, to: it })} aria-label={`${t("edit")} ${it}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
                      disabled={pending}
                      onClick={() => confirm(`${t("delete")} “${it}”?`) && run(() => removePlace(kind, it))}
                      aria-label={`${t("delete")} ${it}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="px-5 py-3 text-sm text-slate-400">—</li>}
      </ul>
      {canEdit && (
        <form
          className="flex items-center gap-2 border-t border-slate-100 px-5 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addPlace(kind, name), () => setName(""));
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t("office_name")} aria-label={addLabel} className="input" />
          <button className="btn-primary shrink-0" disabled={pending || !name.trim()}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="border-t border-slate-100 px-5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
