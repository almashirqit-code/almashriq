"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { siteFetch } from "@/lib/site-import/fetch";
import { SITE_ORIGIN, parseReviews } from "@/lib/site-import/parse";

export type ReviewInput = {
  id?: string;
  customer_name: string;
  country: string;
  rating: number;
  title: string;
  body: string;
  vehicle: string;
  photo_path: string | null;
  review_date: string;
  status: "pending" | "published" | "hidden";
};

function refresh() {
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
}

export async function saveReview(r: ReviewInput): Promise<{ error?: string; ok?: boolean }> {
  await assertRole(["admin", "manager"]);
  if (!r.customer_name.trim() || !r.body.trim()) return { error: "Name and review text are required." };
  const row = {
    customer_name: r.customer_name.trim(),
    country: r.country.trim() || null,
    rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
    title: r.title.trim() || null,
    body: r.body.trim(),
    vehicle: r.vehicle.trim() || null,
    photo_path: r.photo_path,
    review_date: r.review_date || new Date().toISOString().slice(0, 10),
    status: r.status,
  };
  const supabase = await createClient();
  const { error } = r.id ? await supabase.from("reviews").update(row).eq("id", r.id) : await supabase.from("reviews").insert({ ...row, source: "staff" });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function setReviewStatus(id: string, status: "pending" | "published" | "hidden") {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteReview(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

/** Copies the reviews from almashriqtrading.site/reviews as "pending" (you publish the genuine ones). */
export async function importOldReviews(): Promise<{ error?: string; added?: number; found?: number }> {
  await assertRole(["admin", "manager"]);
  let list;
  try {
    list = parseReviews(await (await siteFetch(`${SITE_ORIGIN}/reviews`)).text());
  } catch (e) {
    return { error: `Couldn't read the old website: ${(e as Error).message}` };
  }
  if (!list.length) return { found: 0, added: 0 };
  const rows = list.map((r) => ({
    customer_name: r.name.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase()),
    rating: r.rating,
    body: r.body,
    source: "old_site",
    source_ref: `old:${createHash("sha1").update(`${r.name}|${r.body}`).digest("hex").slice(0, 16)}`,
    status: "pending",
  }));
  const supabase = await createClient();
  const { data, error } = await supabase.from("reviews").upsert(rows, { onConflict: "source_ref", ignoreDuplicates: true }).select("id");
  if (error) return { error: error.message };
  refresh();
  return { found: list.length, added: data?.length ?? 0 };
}
