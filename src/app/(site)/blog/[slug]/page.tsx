import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assetUrl, getCompany, getPost, getPosts, SITE_URL } from "@/lib/public-site";
import { headings, plainText, renderMarkdown } from "@/lib/markdown";
import { JsonLd } from "@/components/site/json-ld";
import { InquiryForm } from "@/components/site/inquiry-form";
import { LOGO_SRC } from "@/components/brand/logo";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return { title: "Article not found", robots: { index: false } };
  const description = p.seo_description || p.excerpt || plainText(p.content);
  const cover = assetUrl(p.cover_path);
  return {
    title: p.seo_title || p.title,
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.seo_title || p.title, description, publishedTime: p.published_at, modifiedTime: p.updated_at, images: cover ? [cover] : [] },
    keywords: p.tags,
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, company, more] = await Promise.all([getPost(slug), getCompany(), getPosts(4)]);
  if (!p) notFound();
  const toc = headings(p.content);
  const cover = assetUrl(p.cover_path);
  const others = more.posts.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          description: p.seo_description || p.excerpt || plainText(p.content),
          image: cover ? [cover] : undefined,
          datePublished: p.published_at,
          dateModified: p.updated_at,
          author: { "@type": "Organization", name: company.company_name },
          publisher: { "@type": "Organization", name: company.company_name, logo: { "@type": "ImageObject", url: `${SITE_URL}${LOGO_SRC}` } },
          mainEntityOfPage: `${SITE_URL}/blog/${p.slug}`,
          keywords: p.tags.join(", ") || undefined,
        }}
      />
      <nav className="mb-4 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link> / <Link href="/blog" className="hover:text-brand-700">Blog</Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="aspect-[16/8] w-full object-cover" />
          )}
          <div className="p-6 sm:p-10">
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <time dateTime={p.published_at}>{new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>
              {p.tags.map((t) => (
                <span key={t} className="rounded bg-navy-50 px-1.5 py-0.5 font-semibold text-navy-700">
                  {t}
                </span>
              ))}
            </div>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-navy-950 sm:text-4xl">{p.title}</h1>
            {p.excerpt && <p className="mt-3 text-lg text-slate-600">{p.excerpt}</p>}
            <div className="prose-blog mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.content) }} />
          </div>
        </article>
        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          {toc.length > 2 && (
            <nav className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Contents">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">In this article</div>
              <ul className="space-y-1.5 text-sm">
                {toc.map((h) => (
                  <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                    <a href={`#${h.id}`} className="text-navy-800 hover:text-brand-700">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 font-black text-navy-950">Ask us about a car</h2>
            <InquiryForm source="blog" compact />
          </div>
          {others.length > 0 && (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">More articles</div>
              <ul className="space-y-2 text-sm">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/blog/${o.slug}`} className="font-semibold text-navy-800 hover:text-brand-700">
                      {o.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
