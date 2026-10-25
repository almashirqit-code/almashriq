/** Shared layout for the Privacy, Cookie and Terms pages: readable width, headings, lists. */
export const LEGAL_UPDATED = "25 October 2026";

export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-1 text-sm text-white/70">Last updated: {LEGAL_UPDATED}</p>
      <div className="glass mt-6 rounded-2xl p-6 text-[15px] leading-7 sm:p-8 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-black [&_h2:first-of-type]:mt-0 [&_li]:mt-1 [&_p]:mt-3 [&_table]:mt-3 [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-current/10 [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-3 [&_th]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wide [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <div className="text-white/80">{intro}</div>
        {children}
      </div>
    </section>
  );
}
