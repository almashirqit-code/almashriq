"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { CATALOG_KINDS, type CatalogKind, type CatalogMake } from "@/lib/catalog";
import { addMake, addModels, deleteMake, deleteModel, updateMake, updateModel } from "./catalog-actions";

/** Configuration → Makes & models: the list the vehicle, part and machinery forms suggest from. */
export function CatalogManager({ makes, usage, canEdit }: { makes: CatalogMake[]; usage: Record<CatalogKind, Record<string, number>>; canEdit: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<CatalogKind>("vehicle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [newMake, setNewMake] = useState("");
  const [newModels, setNewModels] = useState("");
  const [edit, setEdit] = useState<{ type: "make" | "model"; id: string; name: string; code?: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(
    () =>
      makes
        .filter((m) => m.kind === kind && (!q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase())))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [makes, kind, q]
  );
  const current = makes.find((m) => m.id === selectedId && m.kind === kind) ?? null;
  const models = [...(current?.models ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const used = (name: string) => usage[kind]?.[name.trim().toLowerCase()] ?? 0;

  const run = (fn: () => Promise<{ error?: string; added?: number; skipped?: number; id?: string }>, after?: (r: { added?: number; skipped?: number; id?: string }) => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) return setMsg({ ok: false, text: r.error });
      setMsg(null);
      after?.(r);
      router.refresh();
    });

  const kindInfo = CATALOG_KINDS.find((k) => k.key === kind)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:inline-flex">
        {CATALOG_KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => (setKind(k.key), setSelectedId(null), setEdit(null), setMsg(null))}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${kind === k.key ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {k.label} <span className="opacity-60">{makes.filter((m) => m.kind === k.key).length}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        {kindInfo.help} These are <b>suggestions</b> while typing — a make or model that isn&apos;t listed can still be typed in. Removing one here doesn&apos;t change stock that already uses it.
      </p>

      {msg && <p className={`rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* Makes */}
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-8" placeholder="Search makes…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {canEdit && (
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => addMake(kind, newMake), (r) => (setNewMake(""), r.id && setSelectedId(r.id)));
                }}
              >
                <input className="input" placeholder="New make, e.g. Daihatsu" value={newMake} onChange={(e) => setNewMake(e.target.value)} />
                <button className="btn-primary shrink-0" disabled={pending || !newMake.trim()}>
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </form>
            )}
          </div>
          <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
            {list.map((m) => (
              <li key={m.id}>
                {edit?.type === "make" && edit.id === m.id ? (
                  <form
                    className="flex gap-1.5 p-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(() => updateMake(m.id, { name: edit.name }), () => setEdit(null));
                    }}
                  >
                    <input autoFocus className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                    <button className="btn-primary px-2" disabled={pending} aria-label="Save">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-secondary px-2" onClick={() => setEdit(null)} aria-label="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <div className={`group flex items-center gap-1 ${selectedId === m.id ? "bg-brand-50/60" : "hover:bg-slate-50"}`}>
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left" onClick={() => (setSelectedId(m.id), setNewModels(""), setMsg(null))}>
                      <span className={`truncate font-medium ${m.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{m.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {m.models.length} models{used(m.name) ? ` · ${used(m.name)} in stock` : ""}
                      </span>
                      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                    </button>
                    {canEdit && (
                      <div className="flex pr-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <button type="button" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Rename" onClick={() => setEdit({ type: "make", id: m.id, name: m.name })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove from the list"
                          onClick={() =>
                            confirm(`Remove ${m.name} and its ${m.models.length} models from the list?\n\nStock that already uses it is not changed.`) &&
                            run(() => deleteMake(m.id), () => selectedId === m.id && setSelectedId(null))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
            {list.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">{q ? "No make matches." : "No makes yet — add the first one above."}</li>}
          </ul>
        </section>

        {/* Models */}
        <section className="card">
          {!current ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">Choose a make on the left to see and add its models.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
                <h2 className="text-sm font-semibold">
                  {current.name} <span className="font-normal text-slate-400">· {models.length} models</span>
                </h2>
                {canEdit && (
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                    <input type="checkbox" className="h-4 w-4" checked={current.active} disabled={pending} onChange={(e) => run(() => updateMake(current.id, { active: e.target.checked }))} />
                    Suggest this make
                  </label>
                )}
              </div>
              {canEdit && (
                <form
                  className="border-b border-slate-100 p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      () => addModels(current.id, newModels),
                      (r) => (setNewModels(""), setMsg({ ok: true, text: `${r.added ?? 0} model(s) added${r.skipped ? `, ${r.skipped} already in the list` : ""}.` }))
                    );
                  }}
                >
                  <label className="label">Add models</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={newModels}
                    onChange={(e) => setNewModels(e.target.value)}
                    placeholder={"One model per line — or paste a list\nPrius\nAqua\nCorolla Fielder"}
                  />
                  <button className="btn-primary mt-2" disabled={pending || !newModels.trim()}>
                    <Plus className="h-4 w-4" />
                    Add to {current.name}
                  </button>
                </form>
              )}
              <ul className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto">
                {models.map((m) => (
                  <li key={m.id} className="group flex items-center gap-2 px-5 py-2">
                    {edit?.type === "model" && edit.id === m.id ? (
                      <form
                        className="flex flex-1 gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(() => updateModel(m.id, { name: edit.name, model_code: edit.code ?? null }), () => setEdit(null));
                        }}
                      >
                        <input autoFocus className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                        <input className="input w-36 font-mono" placeholder="Model code" value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} />
                        <button className="btn-primary px-2" disabled={pending} aria-label="Save">
                          <Check className="h-4 w-4" />
                        </button>
                        <button type="button" className="btn-secondary px-2" onClick={() => setEdit(null)} aria-label="Cancel">
                          <X className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className={`flex-1 ${m.active ? "text-slate-800" : "text-slate-400 line-through"}`}>
                          {m.name}
                          {m.model_code && <span className="ml-2 font-mono text-xs text-slate-400">{m.model_code}</span>}
                        </span>
                        {canEdit && (
                          <div className="flex opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                            <button type="button" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Rename" onClick={() => setEdit({ type: "model", id: m.id, name: m.name, code: m.model_code ?? "" })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remove from the list" onClick={() => run(() => deleteModel(m.id))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
                {models.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">No models yet for {current.name}.</li>}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
