/**
 * Small, safe Markdown → HTML renderer for blog posts (no dependencies).
 * Supports: # headings, paragraphs, **bold**, *italic*, `code`, [links](url), ![images](url),
 * - / 1. lists, > quotes, ``` code blocks, --- rules. All text is HTML-escaped first.
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const safeUrl = (u: string) => {
  const url = u.trim();
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(url) ? url : "#";
};

function inline(text: string) {
  let s = esc(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy" />`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    const h = safeUrl(href);
    const ext = /^https?:\/\//i.test(h);
    return `<a href="${h}"${ext ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
  });
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return s;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Headings (h2/h3) with ids, for a table of contents. */
export function headings(md: string) {
  return md
    .split("\n")
    .map((l) => l.match(/^(#{2,3})\s+(.+)/))
    .filter(Boolean)
    .map((m) => ({ level: m![1].length, text: m![2].trim(), id: slugify(m![2]) }));
}

export function renderMarkdown(md: string) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];
  let code: string[] | null = null;

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (code) {
      if (/^```/.test(line)) {
        out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
        code = null;
      } else code.push(raw);
      continue;
    }
    if (/^```/.test(line)) {
      flushAll();
      code = [];
      continue;
    }
    if (!line.trim()) {
      flushAll();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.+)/);
    if (h) {
      flushAll();
      const lvl = Math.min(4, Math.max(2, h[1].length + 1)); // "#" in a post body becomes h2 (the page title is h1)
      out.push(`<h${lvl} id="${slugify(h[2])}">${inline(h[2])}</h${lvl}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      out.push("<hr />");
      continue;
    }
    const q = line.match(/^>\s?(.*)/);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1]);
      continue;
    }
    const ul = line.match(/^\s*[-*+]\s+(.+)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.+)/);
    if (ul || ol) {
      flushPara();
      flushQuote();
      const type = ul ? "ul" : "ol";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flushList();
    flushQuote();
    para.push(line.trim());
  }
  if (code) out.push(`<pre><code>${esc((code as string[]).join("\n"))}</code></pre>`);
  flushAll();
  return out.join("\n");
}

/** Plain-text excerpt for meta descriptions. */
export function plainText(md: string, max = 160) {
  const t = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : t;
}
