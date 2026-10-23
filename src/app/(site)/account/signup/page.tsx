import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Create a customer account", robots: { index: false, follow: false } };

export default function CustomerSignUp() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Track your cars, invoices and documents in one place"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/account/login" className="font-bold text-brand-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
