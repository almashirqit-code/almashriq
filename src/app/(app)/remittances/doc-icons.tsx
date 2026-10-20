import type { RemittanceDocument } from "@/lib/types";

/** Small "TT" file badges, one per document; opens the file in a new tab. */
export function DocIcons({ docs }: { docs: Pick<RemittanceDocument, "id" | "file_name" | "mime_type">[] }) {
  if (!docs.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {docs.map((d) => {
        const isImage = d.mime_type?.startsWith("image/");
        return (
          <a
            key={d.id}
            href={`/remittances/docs/${d.id}`}
            target="_blank"
            rel="noreferrer"
            title={d.file_name}
            className={`relative inline-flex h-7 w-6 items-end justify-center rounded-sm pb-0.5 text-[9px] font-bold text-white shadow-sm ${
              isImage ? "bg-sky-600" : "bg-red-600"
            }`}
          >
            <span className="absolute right-0 top-0 h-2 w-2 bg-white/40" style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }} />
            {isImage ? "IMG" : "TT"}
          </a>
        );
      })}
    </div>
  );
}
