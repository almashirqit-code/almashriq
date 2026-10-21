"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";

export type MakeLogoInput = { make: string; label: string; logo_path: string | null; featured: boolean; sort_order: number };

export async function saveMakeLogo(v: MakeLogoInput): Promise<{ error?: string; ok?: boolean }> {
  await assertRole(["admin", "manager"]);
  const make = v.make.trim().toLowerCase();
  if (!make) return { error: "Make is required" };
  const supabase = await createClient();
  const { error } = await supabase.from("make_logos").upsert(
    {
      make,
      label: v.label.trim() || make.replace(/\b\w/g, (c) => c.toUpperCase()),
      logo_path: v.logo_path,
      featured: v.featured,
      sort_order: Math.round(Number(v.sort_order) || 100),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "make" }
  );
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/cars");
  return { ok: true };
}
