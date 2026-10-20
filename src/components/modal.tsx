"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Centered dialog with a header, scrollable body and footer. Closes on Esc / backdrop click. */
export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === "md" ? "max-w-lg" : size === "xl" ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl`}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          {icon}
          <h2 className="flex-1 text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}
