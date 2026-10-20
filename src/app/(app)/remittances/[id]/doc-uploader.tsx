"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { DOC_ACCEPT, uploadRemittanceDocs } from "@/lib/remittance-docs";
import { refreshRemittance } from "../actions";

export function DocUploader({ remittanceId }: { remittanceId: number }) {
  const { t } = useT();
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        accept={DOC_ACCEPT}
        className="hidden"
        onChange={async (e) => {
          const files: File[] = Array.from(e.target.files ?? []);
          if (!files.length) return;
          setBusy(true);
          const failed = await uploadRemittanceDocs(createClient(), remittanceId, files);
          if (failed.length) alert(t("rem_upload_failed", { names: failed.join(", ") }));
          if (ref.current) ref.current.value = "";
          await refreshRemittance(remittanceId);
          router.refresh();
          setBusy(false);
        }}
      />
      <button type="button" className="btn-secondary py-1.5 text-xs" disabled={busy} onClick={() => ref.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        {busy ? "…" : t("upload")}
      </button>
    </>
  );
}
