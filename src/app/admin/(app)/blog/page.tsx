import Link from "next/link";
import { Newspaper, Plus, ImageOff, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { siteAssetUrl } from "@/lib/format";
import { PageHeader, Badge, Empty } from "@/components/ui";

export const metadata = { title: "Blog" };

export default async function BlogAdmin() {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data } = await supabase.from("blog_posts").select("id, title, slug, status, published_at, updated_at, cover_path").order("updated_at", { ascending: false });
  const posts = data ?? [];
  const published = posts.filter((p) => p.status === "published").length;
  return (
    <>
      <PageHeader
        icon={<Newspaper />}
        tone="sky"
        title="Blog"
        subtitle={`${published} published · ${posts.length - published} draft${posts.length - published === 1 ? "" : "s"} — articles on the public website, good for Google and for answering buyers' questions`}
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
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Updated</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex min-w-[16rem] items-center gap-3">
                        {p.cover_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={siteAssetUrl(p.cover_path)} alt="" loading="lazy" className="h-12 w-20 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                        ) : (
                          <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-300" title="No cover image">
                            <ImageOff className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <Link href={`/admin/blog/${p.id}`} className="line-clamp-2 font-semibold text-brand-700 hover:underline">
                            {p.title}
                          </Link>
                          <div className="truncate text-xs text-slate-400">/blog/{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge className={p.status === "published" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-600 ring-slate-400/20"}>
                        {p.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-600">{p.published_at ? new Date(p.published_at).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="whitespace-nowrap text-sm text-slate-500">{new Date(p.updated_at).toLocaleDateString("en-GB")}</td>
                    <td className="text-right">
                      {p.status === "published" && (
                        <a
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700"
                          title="View on website"
                          aria-label={`View "${p.title}" on the website`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
