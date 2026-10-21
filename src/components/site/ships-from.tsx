import { branchFlag, branchName } from "@/lib/branches";

/** "🇸🇬 Ships from Singapore" — the source branch of a car, part or machine. */
export function ShipsFrom({ code, compact = false, className = "" }: { code: string | null | undefined; compact?: boolean; className?: string }) {
  const flag = branchFlag(code);
  if (!code || !flag) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={`Ships from ${branchName(code)}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flag} alt="" className="h-3 w-4 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10" />
      {compact ? branchName(code) : `Ships from ${branchName(code)}`}
    </span>
  );
}
