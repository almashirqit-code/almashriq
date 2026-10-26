import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { avatarSrc } from "@/lib/avatar";
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
  const name = me?.customer?.name || me?.full_name || user.email || "";
  // Unread replies from support (own open thread only; RLS).
  const { data: thread } = me ? await supabase.from("support_threads").select("customer_unread").eq("portal_user_id", user.id).eq("status", "open").maybeSingle() : { data: null };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={me && me.status !== "rejected" ? "/account/profile" : "/account"} aria-label="My profile" className="h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20 hover:ring-white/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(me?.avatar_url, me?.full_name || name)} alt="" className="h-full w-full object-cover" />
          </Link>
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
      {me && me.status !== "rejected" && <AccountNav active={me.status === "active"} unread={thread?.customer_unread ?? 0} />}
      {children}
    </section>
  );
}
