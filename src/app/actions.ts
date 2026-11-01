"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENCIES, type Currency } from "@/lib/types";
import { DISPLAY_COOKIE } from "@/lib/display-currency";

export async function setLocale(locale: "en" | "ja") {
  (await cookies()).set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  // The language switch is for the ERP; flushing "/" would also re-render the cached public site.
  revalidatePath("/admin", "layout");
}

/** Currency the ERP shows totals in (see src/lib/display-currency.ts). */
export async function setDisplayCurrency(cur: string) {
  if (!CURRENCIES.includes(cur as Currency)) return;
  (await cookies()).set(DISPLAY_COOKIE, cur, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/admin", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
