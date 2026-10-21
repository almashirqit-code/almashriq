-- =====================================================================
-- 0011 — Website: inquiries, blog posts, reviews, make logos
-- Run after 0001–0010. Safe to re-run.
-- =====================================================================

-- Public bucket for website images (make logos, blog covers, review photos)
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "site assets read" on storage.objects;
create policy "site assets read" on storage.objects for select using (bucket_id = 'site-assets');
drop policy if exists "site assets write" on storage.objects;
create policy "site assets write" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-assets' and public.is_staff(array['admin','manager']::public.user_role[]));
drop policy if exists "site assets update" on storage.objects;
create policy "site assets update" on storage.objects for update to authenticated
  using (bucket_id = 'site-assets' and public.is_staff(array['admin','manager']::public.user_role[]));
drop policy if exists "site assets delete" on storage.objects;
create policy "site assets delete" on storage.objects for delete to authenticated
  using (bucket_id = 'site-assets' and public.is_staff(array['admin','manager']::public.user_role[]));

-- ---------------------------------------------------------------------
-- Make logos (uploaded by staff; shown in "Shop by make")
-- ---------------------------------------------------------------------
create table if not exists public.make_logos (
  make        text primary key,          -- lower-case make, e.g. "toyota"
  label       text not null,             -- display name, e.g. "Toyota"
  logo_path   text,                      -- in site-assets
  sort_order  int not null default 100,
  featured    boolean not null default true,
  updated_at  timestamptz not null default now()
);
alter table public.make_logos enable row level security;
drop policy if exists make_logos_read on public.make_logos;
create policy make_logos_read on public.make_logos for select using (true);
drop policy if exists make_logos_write on public.make_logos;
create policy make_logos_write on public.make_logos for all to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));

-- ---------------------------------------------------------------------
-- Inquiries from the website
-- ---------------------------------------------------------------------
create table if not exists public.inquiries (
  id           uuid primary key default gen_random_uuid(),
  inquiry_no   bigint generated always as identity,
  name         text not null,
  email        text,
  phone        text,
  country      text,
  port         text,
  message      text,
  vehicle_id   uuid references public.vehicles (id) on delete set null,
  stock_no     text,
  page_url     text,
  source       text not null default 'website',     -- website / car page / contact
  status       text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost', 'spam')),
  assigned_to  uuid references public.profiles (id) on delete set null,
  customer_id  uuid references public.customers (id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint inquiries_contact_chk check (email is not null or phone is not null)
);
create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);
create index if not exists inquiries_assigned_idx on public.inquiries (assigned_to);

create or replace function public.trg_inquiries_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists inquiries_touch on public.inquiries;
create trigger inquiries_touch before update on public.inquiries
  for each row execute function public.trg_inquiries_touch();

/** Who sees an inquiry: admin all; manager unassigned + own office; sales only assigned to them. */
create or replace function public.can_see_inquiry(p_assigned uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  r public.user_role := public.auth_role();
  mo text;
  ao text;
begin
  if r is null then return false; end if;
  if r = 'admin' then return true; end if;
  if r = 'sales' then return p_assigned = auth.uid(); end if;
  mo := public.auth_office();
  if mo is null or p_assigned is null then return true; end if;
  ao := public.staff_office(p_assigned);
  return ao is null or ao = mo;
end $$;
grant execute on function public.can_see_inquiry(uuid) to authenticated;

alter table public.inquiries enable row level security;
drop policy if exists inquiries_read on public.inquiries;
create policy inquiries_read on public.inquiries for select to authenticated
  using (public.can_see_inquiry(assigned_to));
drop policy if exists inquiries_update on public.inquiries;
create policy inquiries_update on public.inquiries for update to authenticated
  using (public.can_see_inquiry(assigned_to))
  -- sales may update status/notes on their own inquiries but not hand them to someone else
  with check (public.auth_role() <> 'sales' or assigned_to = auth.uid());
drop policy if exists inquiries_delete on public.inquiries;
create policy inquiries_delete on public.inquiries for delete to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]));

/** Website visitors submit through this function only (no direct table access). */
create or replace function public.submit_inquiry(
  p_name text, p_email text, p_phone text, p_country text, p_port text, p_message text, p_stock_no text, p_page_url text, p_source text
)
returns bigint
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid;
  n bigint;
  em text := nullif(lower(trim(coalesce(p_email, ''))), '');
  ph text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Name is required'; end if;
  if em is null and ph is null then raise exception 'Email or phone is required'; end if;
  if em is not null and em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email'; end if;
  -- simple flood guard: max 5 inquiries per contact per hour
  if (select count(*) from public.inquiries
       where created_at > now() - interval '1 hour'
         and ((em is not null and email = em) or (ph is not null and phone = ph))) >= 5 then
    raise exception 'Too many inquiries, please try again later';
  end if;
  if nullif(trim(coalesce(p_stock_no, '')), '') is not null then
    select id into v_id from public.vehicles where upper(stock_no) = upper(trim(p_stock_no)) and show_on_website limit 1;
  end if;
  insert into public.inquiries (name, email, phone, country, port, message, vehicle_id, stock_no, page_url, source)
  values (left(trim(p_name), 120), left(em, 200), left(ph, 50), left(nullif(trim(coalesce(p_country, '')), ''), 80),
          left(nullif(trim(coalesce(p_port, '')), ''), 80), left(nullif(trim(coalesce(p_message, '')), ''), 4000),
          v_id, left(nullif(trim(coalesce(p_stock_no, '')), ''), 40), left(p_page_url, 500), coalesce(nullif(p_source, ''), 'website'))
  returning inquiry_no into n;
  return n;
end $$;
grant execute on function public.submit_inquiry(text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Blog posts
-- ---------------------------------------------------------------------
create table if not exists public.blog_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title            text not null,
  excerpt          text,
  content          text not null default '',      -- Markdown
  cover_path       text,                           -- in site-assets
  tags             text[] not null default '{}',
  status           text not null default 'draft' check (status in ('draft', 'published')),
  published_at     timestamptz,
  seo_title        text,
  seo_description  text,
  author_id        uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx on public.blog_posts (status, published_at desc);
drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch before update on public.blog_posts
  for each row execute function public.trg_inquiries_touch();

alter table public.blog_posts enable row level security;
drop policy if exists blog_read on public.blog_posts;
create policy blog_read on public.blog_posts for select to authenticated using (public.auth_role() is not null);
drop policy if exists blog_write on public.blog_posts;
create policy blog_write on public.blog_posts for all to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));

drop function if exists public.public_posts(int, int);
create or replace function public.public_posts(p_limit int default 12, p_offset int default 0)
returns table (slug text, title text, excerpt text, cover_path text, tags text[], published_at timestamptz, updated_at timestamptz, total_count bigint)
language sql stable security definer set search_path = public
as $$
  select slug, title, excerpt, cover_path, tags, published_at, updated_at, count(*) over ()
    from public.blog_posts
   where status = 'published' and published_at <= now()
   order by published_at desc
   limit least(greatest(coalesce(p_limit, 12), 1), 500) offset greatest(coalesce(p_offset, 0), 0)
$$;
grant execute on function public.public_posts(int, int) to anon, authenticated;

drop function if exists public.public_post(text);
create or replace function public.public_post(p_slug text)
returns table (slug text, title text, excerpt text, content text, cover_path text, tags text[], published_at timestamptz,
               updated_at timestamptz, seo_title text, seo_description text, author text)
language sql stable security definer set search_path = public
as $$
  select b.slug, b.title, b.excerpt, b.content, b.cover_path, b.tags, b.published_at, b.updated_at, b.seo_title, b.seo_description,
         coalesce(p.full_name, 'Al Mashriq Trading')
    from public.blog_posts b left join public.profiles p on p.id = b.author_id
   where b.slug = p_slug and b.status = 'published' and b.published_at <= now()
$$;
grant execute on function public.public_post(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Reviews (only "published" ones are public)
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null,
  country        text,
  rating         int not null default 5 check (rating between 1 and 5),
  title          text,
  body           text not null,
  vehicle        text,
  photo_path     text,                        -- in site-assets
  review_date    date not null default current_date,
  source         text not null default 'staff' check (source in ('old_site', 'staff', 'customer')),
  source_ref     text unique,                 -- de-duplicates imports
  status         text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  created_at     timestamptz not null default now()
);
alter table public.reviews enable row level security;
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select to authenticated using (public.auth_role() is not null);
drop policy if exists reviews_write on public.reviews;
create policy reviews_write on public.reviews for all to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));

drop function if exists public.public_reviews(int);
create or replace function public.public_reviews(p_limit int default 50)
returns table (id uuid, customer_name text, country text, rating int, title text, body text, vehicle text, photo_path text,
               review_date date, avg_rating numeric, review_count bigint)
language sql stable security definer set search_path = public
as $$
  select id, customer_name, country, rating, title, body, vehicle, photo_path, review_date,
         round(avg(rating) over (), 1), count(*) over ()
    from public.reviews
   where status = 'published'
   order by review_date desc, created_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 500)
$$;
grant execute on function public.public_reviews(int) to anon, authenticated;

-- Make logos with live stock counts for the website
create or replace function public.public_makes()
returns table (make text, label text, logo_path text, n bigint, featured boolean, sort_order int)
language sql stable security definer set search_path = public
as $$
  with c as (
    select lower(make) mk, initcap(lower(make)) lbl, count(*) n
      from public.vehicles
     where show_on_website and status in ('in_stock', 'reserved', 'sold')
     group by 1, 2
  )
  select c.mk, coalesce(m.label, c.lbl), m.logo_path, c.n, coalesce(m.featured, true), coalesce(m.sort_order, 100)
    from c left join public.make_logos m on m.make = c.mk
   order by coalesce(m.sort_order, 100), c.n desc
$$;
grant execute on function public.public_makes() to anon, authenticated;

-- Everything the sitemap needs, in one call
create or replace function public.public_sitemap()
returns table (kind text, key text, updated timestamptz)
language sql stable security definer set search_path = public
as $$
  select 'car', stock_no, coalesce(updated_at, created_at) from public.vehicles
   where show_on_website and status in ('in_stock', 'reserved')
  union all
  select 'post', slug, updated_at from public.blog_posts where status = 'published' and published_at <= now()
  union all
  select 'make', lower(make), max(created_at) from public.vehicles
   where show_on_website and status in ('in_stock', 'reserved') group by lower(make)
$$;
grant execute on function public.public_sitemap() to anon, authenticated;
