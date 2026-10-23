"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/public-site";

export type AuthState = { error?: string; ok?: boolean };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < 8) return "Use a password of at least 8 characters.";
  if (password.length > 72) return "Use a password of at most 72 characters.";
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

/** Customer sign-in. Staff who use this page are sent on to the ERP. */
export async function customerSignIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = clean(formData.get("email"), 200).toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Same brute-force limits as the staff login, and fail closed.
  const [perAccount, perIp] = await Promise.all([
    rateLimit("cust-login", 5, 900, email, true),
    rateLimit("cust-login-ip", 30, 900, "", true),
  ]);
  if (!perAccount || !perIp) return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return { error: "Please confirm your email first. Check your inbox for the link we sent you." };
    return { error: "Invalid email or password." };
  }
  const { data: staff } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  redirect(staff ? "/admin" : "/account");
}

/** Self sign-up. The database trigger turns it into a pending portal account (never a staff profile). */
export async function customerSignUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (formData.get("website")) return { ok: true }; // honeypot: bots fill hidden fields
  if (!(await rateLimit("cust-signup", 5, 3600))) return { error: "Too many sign-ups from your network. Please try again later." };

  const email = clean(formData.get("email"), 200).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const full_name = clean(formData.get("full_name"), 120);
  if (!full_name) return { error: "Please enter your name." };
  if (!EMAIL.test(email)) return { error: "Please enter a valid email address." };
  const bad = checkNewPassword(password, String(formData.get("confirm") ?? ""));
  if (bad) return { error: bad };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/account`,
      data: {
        full_name,
        company: clean(formData.get("company"), 120),
        phone: clean(formData.get("phone"), 40),
        whatsapp: clean(formData.get("whatsapp"), 40),
        country: clean(formData.get("country"), 80),
        port: clean(formData.get("port"), 80),
      },
    },
  });
  if (error) {
    if (error.code === "weak_password") return { error: error.message };
    return { error: "We couldn't create your account. Please check your details and try again." };
  }
  // With email confirmation off there is a session already; otherwise they confirm by email first.
  if (data.session) redirect("/account");
  return { ok: true };
}

/** Sends a reset link. Always answers the same way, so it never reveals which emails have accounts. */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = clean(formData.get("email"), 200).toLowerCase();
  if (!EMAIL.test(email)) return { error: "Please enter a valid email address." };
  const [perEmail, perIp] = await Promise.all([rateLimit("cust-reset", 3, 3600, email), rateLimit("cust-reset-ip", 10, 3600)]);
  if (perEmail && perIp) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/callback?next=/account/reset` });
  }
  return { ok: true };
}

/** New password, after following the reset link (which signs the customer in). */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const bad = checkNewPassword(password, String(formData.get("confirm") ?? ""));
  if (bad) return { error: bad };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.code === "same_password" ? "Choose a password you haven't used before." : error.message };
  redirect("/account");
}

export async function customerSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/account/login");
}
