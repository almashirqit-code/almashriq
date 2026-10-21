"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { slugify } from "@/lib/markdown";

export type PostInput = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_path: string | null;
  tags: string;
  status: "draft" | "published";
  published_at: string; // yyyy-mm-dd
  seo_title: string;
  seo_description: string;
};

export async function savePost(p: PostInput): Promise<{ error?: string; id?: string }> {
  const me = await assertRole(["admin", "manager"]);
  const title = p.title.trim();
  if (!title) return { error: "Title is required" };
  const slug = slugify(p.slug || title);
  if (!slug) return { error: "Slug is required" };
  const row = {
    title,
    slug,
    excerpt: p.excerpt.trim() || null,
    content: p.content,
    cover_path: p.cover_path,
    tags: p.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12),
    status: p.status,
    published_at: p.status === "published" ? (p.published_at ? new Date(`${p.published_at}T09:00:00+09:00`).toISOString() : new Date().toISOString()) : null,
    seo_title: p.seo_title.trim() || null,
    seo_description: p.seo_description.trim() || null,
  };
  const supabase = await createClient();
  const res = p.id
    ? await supabase.from("blog_posts").update(row).eq("id", p.id).select("id").single()
    : await supabase.from("blog_posts").insert({ ...row, author_id: me.id }).select("id").single();
  if (res.error) return { error: res.error.code === "23505" ? "Another post already uses this URL (slug)." : res.error.message };
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  return { id: res.data.id as string };
}

export async function deletePost(id: string) {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}
