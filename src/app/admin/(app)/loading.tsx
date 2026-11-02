import { getT } from "@/lib/i18n/server";

/**
 * Shown in the content area (the sidebar stays) while an ERP page loads its data, so a click
 * gives instant feedback instead of the old page sitting still until the new one is ready.
 */
export default async function Loading() {
  const { t } = await getT();
  const bar = "rounded-md bg-slate-200/80";
  return (
    <div role="status" aria-live="polite" className="motion-safe:animate-pulse">
      <span className="sr-only">{t("loading")}</span>
      <div className="mb-6 flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-xl bg-slate-200/80" />
        <div className="space-y-2">
          <div className={`h-6 w-48 ${bar}`} />
          <div className={`h-3.5 w-32 ${bar}`} />
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="flex gap-2 border-b border-slate-100 p-3">
          <div className="h-9 w-64 rounded-xl bg-slate-100" />
          <div className="h-9 w-20 rounded-xl bg-slate-100" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3.5 last:border-b-0">
            <div className={`h-4 w-16 ${bar}`} />
            <div className={`h-4 flex-1 ${bar}`} />
            <div className={`hidden h-4 w-28 sm:block ${bar}`} />
            <div className={`hidden h-4 w-20 md:block ${bar}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
