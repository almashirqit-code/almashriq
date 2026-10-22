"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** "Check now" button + automatic re-check every minute while the page is open. */
export function RefreshControls({ everySec = 60 }: { everySec?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") start(() => router.refresh());
    }, everySec * 1000);
    return () => clearInterval(id);
  }, [router, everySec]);
  return (
    <button type="button" className="btn-secondary" disabled={pending} onClick={() => start(() => router.refresh())}>
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Checking…" : "Check now"}
    </button>
  );
}
