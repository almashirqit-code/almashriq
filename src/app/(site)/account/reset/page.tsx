import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { ResetForm } from "../forms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false } };

/** Reached from the reset email (the callback signs the customer in first; middleware requires the session). */
export default function CustomerReset() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a password of at least 8 characters">
      <ResetForm />
    </AuthShell>
  );
}
