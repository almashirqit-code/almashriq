"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export type SearchOption = { value: string; label: string };

/**
 * A filter dropdown with a search box: a drop-in for `<select>` inside a GET filter form
 * (submits a hidden input with the same `name`). `allLabel` adds the "All" row (value `allValue`).
 */
export function SearchSelect({
  name,
  label,
  options,
  defaultValue = "",
  allLabel,
  allValue = "",
  className = "",
}: {
  name: string;
  label: string;
  options: SearchOption[];
  defaultValue?: string;
  allLabel?: string;
  allValue?: string;
  className?: string;
}) {
  const { t } = useT();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  // Follow the URL when the page re-renders with other filters (back / forward, Clear).
  useEffect(() => setValue(defaultValue), [defaultValue]);

  const all = useMemo(() => (allLabel === undefined ? options : [{ value: allValue, label: allLabel }, ...options]), [options, allLabel, allValue]);
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return words.length ? all.filter((o) => words.every((w) => o.label.toLowerCase().includes(w) || o.value.toLowerCase() === w)) : all;
  }, [all, q]);
  const current = all.find((o) => o.value === value) ?? all[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const show = () => {
    setQ("");
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (o: SearchOption) => {
    setValue(o.value);
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input inline-flex w-auto max-w-[16rem] items-center gap-2 text-left"
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            show();
          }
        }}
      >
        <span className={`truncate ${value === allValue && allLabel !== undefined ? "text-slate-600" : "font-semibold text-slate-800"}`}>{current?.label ?? label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              autoFocus
              value={q}
              role="combobox"
              aria-expanded
              aria-controls={`${id}-list`}
              aria-activedescendant={list[active] ? `${id}-${active}` : undefined}
              aria-label={`${t("search")}: ${label}`}
              placeholder={t("search_placeholder")}
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(list.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  // Pick, don't submit the filter form yet.
                  e.preventDefault();
                  if (list[active]) pick(list[active]);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                  button.current?.focus();
                } else if (e.key === "Tab") {
                  setOpen(false);
                }
              }}
            />
          </div>
          <ul id={`${id}-list`} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1">
            {list.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">{t("no_results")}</li>}
            {list.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={o.value === value}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${i === active ? "bg-slate-100" : ""} ${o.value === value ? "font-semibold text-slate-900" : "text-slate-700"}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o)}
              >
                <Check className={`h-3.5 w-3.5 shrink-0 ${o.value === value ? "text-cerulean-600" : "invisible"}`} />
                <span className="truncate">{o.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
