import type { Metadata } from "next";
import Link from "next/link";
import { assetUrl, getPosts } from "@/lib/public-site";

export const revalidate = 300;
const SIZE = 12;

export const metadata: Metadata = {
  title: "Blog — buying and importing Japanese used cars",
  description: "Guides and news from Al Mashriq Trading: buying Japanese used cars, auctions, shipping, import rules and documents.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { posts, total } = await getPosts(SIZE, (page - 1) * SIZE);
  const pages = Math.max(1, Math.ceil(total / SIZE));
  const [first, ...rest] = posts;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">Blog</h1>
      <p className="mt-1 pl-4 text-slate-500">Guides on buying, shipping and importing Japanese used cars.</p>

      {!posts.length ? (
        <div className="mt-8 rounded-xl bg-white p-14 text-center text-slate-500 ring-1 ring-slate-200">No articles yet — check back soon.</div>
      ) : (
        <>
          {first && page === 1 && (
            <Link href={`/blog/${first.slug}`} className="group mt-6 grid overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 md:grid-cols-2">
              <div className="aspect-[16/9] bg-navy-100 md:aspect-auto">
                {first.cover_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(first.cover_path)!} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-col justify-center p-6 md:p-8">
                <PostMeta date={first.published_at} tags={first.tags} />
                <h2 className="mt-2 text-2xl font-black text-navy-950 group-hover:text-brand-700">{first.title}</h2>
                {first.excerpt && <p className="mt-2 text-slate-600">{first.excerpt}</p>}
                <span className="mt-4 text-sm font-bold text-brand-700">Read article →</span>
              </div>
            </Link>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(page === 1 ? rest : posts).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:shadow-md">
                <div className="aspect-[16/9] bg-navy-100">
                  {p.cover_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(p.cover_path)!} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <PostMeta date={p.published_at} tags={p.tags} />
                  <h2 className="mt-1 line-clamp-2 font-bold text-navy-950 group-hover:text-brand-700">{p.title}</h2>
                  {p.excerpt && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{p.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
          {pages > 1 && (
            <nav className="mt-8 flex justify-center gap-1.5" aria-label="Pages">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={p === 1 ? "/blog" : `/blog?page=${p}`} className={`min-w-10 rounded-lg px-3 py-2 text-center text-sm font-bold ${p === page ? "bg-navy-800 text-white" : "bg-white ring-1 ring-slate-200"}`}>
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function PostMeta({ date, tags }: { date: string; tags: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      <time dateTime={date}>{new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>
      {tags.slice(0, 2).map((t) => (
        <span key={t} className="rounded bg-navy-50 px-1.5 py-0.5 font-semibold text-navy-700">
          {t}
        </span>
      ))}
    </div>
  );
}
