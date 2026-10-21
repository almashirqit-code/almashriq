-- =====================================================================
-- 0018 — Photo galleries for parts (bulk ZIP import, cover = first photo)
--   • part_images (vehicle-images bucket, parts/<part id>/…)
--   • the single parts.photo_path is copied in as the cover (column kept)
--   • public_parts returns cover / image_count / images; public_part(part_no)
--   • sitemap lists part pages
-- Run after 0001–0017. Safe to re-run.
-- =====================================================================

create table if not exists public.part_images (
  id          uuid primary key default gen_random_uuid(),
  part_id     uuid not null references public.parts (id) on delete cascade,
  path        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists part_images_part_idx on public.part_images (part_id, sort_order);

alter table public.part_images enable row level security;
drop policy if exists pimg_read on public.part_images;
create policy pimg_read on public.part_images for select to authenticated
  using ((select public.auth_role()) is not null);
drop policy if exists pimg_ins on public.part_images;
create policy pimg_ins on public.part_images for insert to authenticated
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists pimg_upd on public.part_images;
create policy pimg_upd on public.part_images for update to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])))
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists pimg_del on public.part_images;
create policy pimg_del on public.part_images for delete to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])));

-- Earlier single photos (site-assets bucket) become the cover; "site-assets:" marks the bucket.
insert into public.part_images (part_id, path, sort_order)
select p.id, 'site-assets:' || p.photo_path, 0
  from public.parts p
 where p.photo_path is not null
   and not exists (select 1 from public.part_images i where i.part_id = p.id);

-- ---------------------------------------------------------------------
-- Website
-- ---------------------------------------------------------------------
drop function if exists public.public_parts(text, text, text, text, int, int, text);
create or replace function public.public_parts(
  p_q text default null,
  p_category text default null,
  p_make text default null,
  p_condition text default null,
  p_limit int default 24,
  p_offset int default 0,
  p_branch text default null
)
returns table (
  id uuid, part_no text, name text, category text, make text, model text, model_code text, year_from int, year_to int,
  oem_no text, condition text, quantity int, price numeric, price_currency text, description text,
  status text, created_at timestamptz, total_count bigint, branch text, cover text, image_count int, images text[]
)
language sql stable security definer set search_path = public
as $$
  with page as (
    select p.*, count(*) over () as total
      from public.parts p
     where p.show_on_website
       and p.status in ('available', 'reserved')
       and (p_q is null or p_q = '' or (p.part_no || ' ' || p.name || ' ' || coalesce(p.make, '') || ' ' || coalesce(p.model, '') || ' ' ||
            coalesce(p.model_code, '') || ' ' || coalesce(p.oem_no, '') || ' ' || coalesce(p.category, '')) ilike '%' || p_q || '%')
       and (p_category is null or p_category = '' or lower(p.category) = lower(p_category))
       and (p_make is null or p_make = '' or lower(p.make) = lower(p_make))
       and (p_condition is null or p_condition = '' or p.condition = lower(p_condition))
       and (p_branch is null or p_branch = '' or p.branch = upper(p_branch))
     order by (p.status = 'reserved'), p.created_at desc
     limit least(greatest(coalesce(p_limit, 24), 1), 96)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select p.id, p.part_no, p.name, p.category, p.make, p.model, p.model_code, p.year_from, p.year_to,
         p.oem_no, p.condition, p.quantity, p.price, p.price_currency, p.description,
         p.status, p.created_at, p.total, p.branch,
         imgs.paths[1], coalesce(cardinality(imgs.paths), 0), coalesce(imgs.paths[1:5], '{}')
    from page p
    left join lateral (
      select array_agg(i.path order by i.sort_order, i.created_at) paths from public.part_images i where i.part_id = p.id
    ) imgs on true
   order by (p.status = 'reserved'), p.created_at desc
$$;
grant execute on function public.public_parts(text, text, text, text, int, int, text) to anon, authenticated;

drop function if exists public.public_part(text);
create or replace function public.public_part(p_part_no text)
returns table (
  id uuid, part_no text, name text, category text, make text, model text, model_code text, year_from int, year_to int,
  oem_no text, condition text, quantity int, price numeric, price_currency text, description text,
  status text, created_at timestamptz, updated_at timestamptz, branch text, images text[]
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.part_no, p.name, p.category, p.make, p.model, p.model_code, p.year_from, p.year_to,
         p.oem_no, p.condition, p.quantity, p.price, p.price_currency, p.description,
         p.status, p.created_at, p.updated_at, p.branch,
         coalesce((select array_agg(i.path order by i.sort_order, i.created_at) from public.part_images i where i.part_id = p.id), '{}')
    from public.parts p
   where p.show_on_website
     and p.status in ('available', 'reserved')
     and upper(p.part_no) = upper(p_part_no)
   limit 1
$$;
grant execute on function public.public_part(text) to anon, authenticated;

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
  union all
  select 'part', part_no, updated_at from public.parts
   where show_on_website and status in ('available', 'reserved')
$$;
grant execute on function public.public_sitemap() to anon, authenticated;
