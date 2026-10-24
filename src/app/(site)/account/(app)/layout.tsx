import { redirect } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalMe } from "@/lib/portal";
import { customerSignOut } from "../actions";
import { AccountNav } from "./account-nav";

/** Signed-in customer area: header (who, customer no., agent), tabs once the account is linked. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const me = await getPortalMe();
  if (!me) {
    // Staff (or a login without a portal account) — the ERP is their place.
    const { data: staff } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (staff) redirect("/admin");
  }
  const name = me?.customer?.name || me?.full_name || user.email;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black">{name}</h1>
            <p className="text-sm text-white/70">
              {me?.customer ? `Customer no. ${me.customer.customer_no}` : "My account"}
              {me?.agent ? ` · Your agent: ${me.agent.name}` : ""}
            </p>
          </div>
        </div>
        <form action={customerSignOut}>
          <button className="glass inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold hover:brightness-105">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
      {me && me.status !== "rejected" && <AccountNav active={me.status === "active"} />}
      {children}
    </section>
  );
}
