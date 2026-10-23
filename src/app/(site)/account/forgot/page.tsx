import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ForgotForm } from "../forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default function CustomerForgot() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="We'll email you a link to set a new one"
      footer={
        <Link href="/account/login" className="font-bold text-brand-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
