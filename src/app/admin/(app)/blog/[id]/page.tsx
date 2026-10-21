import { notFound } from "next/navigation";
import { Newspaper, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { PostEditor } from "../post-editor";
import { deletePost } from "../actions";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "manager"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  return (
    <>
      <PageHeader
        icon={<Newspaper />}
        tone="sky"
        title="Edit post"
        back={{ href: "/admin/blog", label: "Blog" }}
        actions={
          <ConfirmButton action={deletePost.bind(null, id)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </ConfirmButton>
        }
      />
      <PostEditor
        initial={{
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt ?? "",
          content: p.content ?? "",
          cover_path: p.cover_path,
          tags: (p.tags ?? []).join(", "),
          status: p.status,
          published_at: (p.published_at ?? new Date().toISOString()).slice(0, 10),
          seo_title: p.seo_title ?? "",
          seo_description: p.seo_description ?? "",
        }}
      />
    </>
  );
}
