import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Customer sign in", robots: { index: false, follow: false } };

export default async function CustomerLogin({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;
  return (
    <AuthShell
      title="Customer sign in"
      subtitle="See your invoices, payments and shipments"
      footer={
        <>
          New customer?{" "}
          <Link href="/account/signup" className="font-bold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {link === "expired" && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-300/50">
          That link has expired or was already used. Sign in, or request a new password link.
        </p>
      )}
      <SignInForm />
    </AuthShell>
  );
}
