"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function signIn(_prev: { error: string }, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  // Brute-force protection: 5 tries per email per 15 min, 30 per IP per 15 min.
  // Fail closed — a database hiccup must not lift the limit on the sign-in path.
  const [perAccount, perIp] = await Promise.all([
    rateLimit("login", 5, 900, email, true),
    rateLimit("login-ip", 30, 900, "", true),
  ]);
  if (!perAccount || !perIp) return { error: "too_many" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password") || ""),
  });
  if (error || !data.user) return { error: "invalid" };

  const { data: profile } = await supabase.from("profiles").select("active").eq("id", data.user.id).single();
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: "disabled" };
  }
  redirect("/admin");
}
