import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader, Badge, Empty } from "@/components/ui";

export const metadata = { title: "Blog" };

export default async function BlogAdmin() {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data } = await supabase.from("blog_posts").select("id, title, slug, status, published_at, updated_at, cover_path").order("updated_at", { ascending: false });
  const posts = data ?? [];
  return (
    <>
      <PageHeader
        icon={<Newspaper />}
        tone="sky"
        title="Blog"
        subtitle="Articles on the public website — good for Google and for answering buyers' questions"
        actions={
          <Link href="/admin/blog/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New post
          </Link>
        }
      />
      <div className="card overflow-hidden">
        {posts.length === 0 ? (
          <Empty>No posts yet — write your first article (for example a buying guide or shipping times to your main countries).</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Published</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/blog/${p.id}`} className="font-semibold text-brand-700 hover:underline">
                      {p.title}
                    </Link>
                    <div className="text-xs text-slate-400">/blog/{p.slug}</div>
                  </td>
                  <td>
                    <Badge className={p.status === "published" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-600 ring-slate-400/20"}>
                      {p.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="text-sm text-slate-600">{p.published_at ? new Date(p.published_at).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="text-sm text-slate-500">{new Date(p.updated_at).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
