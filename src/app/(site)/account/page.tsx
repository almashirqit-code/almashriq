import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, ShieldCheck, ShieldAlert, MessageCircle, Car, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCompany, whatsapp } from "@/lib/public-site";
import { customerSignOut } from "./actions";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

type Account = { status: "pending" | "active" | "rejected"; full_name: string | null; email: string };

export default async function AccountHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const [{ data }, company] = await Promise.all([
    supabase.from("portal_accounts").select("status, full_name, email").eq("user_id", user.id).maybeSingle(),
    getCompany(),
  ]);
  const acct = data as Account | null;
  if (!acct) {
    // Staff (or an account created before the portal existed).
    const { data: staff } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (staff) redirect("/admin");
  }
  const wa = whatsapp(company, "Hello Al Mashriq, I'm writing from my customer account.");
  const name = acct?.full_name || user.email;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/70">My account</p>
          <h1 className="text-2xl font-black">Welcome, {name}</h1>
        </div>
        <form action={customerSignOut}>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ring-1 ring-current/20 hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>

      {acct?.status === "active" ? (
        <div className="glass rounded-2xl p-6">
          <ShieldCheck className="mb-2 h-8 w-8 text-emerald-600" />
          <h2 className="text-lg font-bold">Your account is active</h2>
          <p className="mt-1 text-sm text-white/70">
            Your invoices, payments, reservations, shipments and documents will appear here very soon. Until then, your sales agent can help with anything you need.
          </p>
        </div>
      ) : acct?.status === "rejected" ? (
        <div className="glass rounded-2xl p-6">
          <ShieldAlert className="mb-2 h-8 w-8 text-brand-600" />
          <h2 className="text-lg font-bold">We couldn&apos;t verify this account</h2>
          <p className="mt-1 text-sm text-white/70">Please contact us so we can help you get set up.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <Clock3 className="mb-2 h-8 w-8 text-amber-600" />
          <h2 className="text-lg font-bold">We&apos;re setting up your account</h2>
          <p className="mt-1 text-sm text-white/70">
            Our team will link your purchases to this login and assign your sales agent. Once that&apos;s done, your invoices, payments and shipments will appear here.
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="glass flex items-center gap-3 rounded-2xl p-4 font-bold hover:brightness-105">
            <MessageCircle className="h-5 w-5 text-[#25D366]" /> Message us on WhatsApp
          </a>
        )}
        <Link href="/cars" className="glass flex items-center gap-3 rounded-2xl p-4 font-bold hover:brightness-105">
          <Car className="h-5 w-5 text-brand-600" /> Browse our stock
        </Link>
      </div>
    </section>
  );
}
