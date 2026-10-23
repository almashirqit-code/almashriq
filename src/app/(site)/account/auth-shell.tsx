import { UserRound } from "lucide-react";

/** Centered card used by the customer sign-in, sign-up and password pages. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-md px-4 py-10 lg:py-14">
      <div className="glass rounded-2xl p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-black">{title}</h1>
            {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
      {footer && <div className="mt-5 text-center text-sm text-white/70">{footer}</div>}
    </section>
  );
}
