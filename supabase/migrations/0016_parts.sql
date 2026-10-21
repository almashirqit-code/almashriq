-- =====================================================================
-- 0016 — Spare parts: stock table (admin) + public listing for the website
-- Run after 0001–0015. Safe to re-run.
-- =====================================================================

create table if not exists public.parts (
  id               uuid primary key default gen_random_uuid(),
  part_no          text not null unique,               -- our reference, e.g. "P-1023"
  name             text not null,                      -- "Front bumper", "Headlight (L)"
  category         text,                               -- Engine, Body, Lighting, Suspension…
  make             text,
  model            text,
  model_code       text,
  year_from        int check (year_from between 1950 and 2100),
  year_to          int check (year_to between 1950 and 2100),
  oem_no           text,                               -- manufacturer part number
  condition        text not null default 'used' check (condition in ('new', 'used', 'rebuilt')),
  quantity         int not null default 1 check (quantity >= 0),
  price            numeric(14, 2) check (price is null or price >= 0),
  price_currency   text not null default 'USD' check (price_currency in ('JPY', 'USD', 'EUR', 'GBP')),
  cost             numeric(14, 2) check (cost is null or cost >= 0),   -- JPY, staff only
  location         text,
  description      text,
  photo_path       text,                               -- in site-assets
  status           text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  show_on_website  boolean not null default true,
  notes            text,                               -- internal
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists parts_public_idx on public.parts (show_on_website, status, created_at desc);
create index if not exists parts_category_idx on public.parts (lower(category));
create index if not exists parts_make_idx on public.parts (lower(make));
create index if not exists parts_created_by_idx on public.parts (created_by);

drop trigger if exists parts_touch on public.parts;
create trigger parts_touch before update on public.parts
  for each row execute function public.touch_updated_at();

alter table public.parts enable row level security;
drop policy if exists parts_read on public.parts;
create policy parts_read on public.parts for select to authenticated
  using ((select public.auth_role()) is not null);
drop policy if exists parts_ins on public.parts;
create policy parts_ins on public.parts for insert to authenticated
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists parts_upd on public.parts;
create policy parts_upd on public.parts for update to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])))
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists parts_del on public.parts;
create policy parts_del on public.parts for delete to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])));

-- ---------------------------------------------------------------------
-- Website: parts listing (no cost / notes / internal fields)
-- ---------------------------------------------------------------------
drop function if exists public.public_parts(text, text, text, text, int, int);
create or replace function public.public_parts(
  p_q text default null,
  p_category text default null,
  p_make text default null,
  p_condition text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, part_no text, name text, category text, make text, model text, model_code text, year_from int, year_to int,
  oem_no text, condition text, quantity int, price numeric, price_currency text, description text, photo_path text,
  status text, created_at timestamptz, total_count bigint
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.part_no, p.name, p.category, p.make, p.model, p.model_code, p.year_from, p.year_to,
         p.oem_no, p.condition, p.quantity, p.price, p.price_currency, p.description, p.photo_path,
         p.status, p.created_at, count(*) over ()
    from public.parts p
   where p.show_on_website
     and p.status in ('available', 'reserved')
     and (p_q is null or p_q = '' or (p.part_no || ' ' || p.name || ' ' || coalesce(p.make, '') || ' ' || coalesce(p.model, '') || ' ' ||
          coalesce(p.model_code, '') || ' ' || coalesce(p.oem_no, '') || ' ' || coalesce(p.category, '')) ilike '%' || p_q || '%')
     and (p_category is null or p_category = '' or lower(p.category) = lower(p_category))
     and (p_make is null or p_make = '' or lower(p.make) = lower(p_make))
     and (p_condition is null or p_condition = '' or p.condition = lower(p_condition))
   order by (p.status = 'reserved'), p.created_at desc
   limit least(greatest(coalesce(p_limit, 24), 1), 96)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
grant execute on function public.public_parts(text, text, text, text, int, int) to anon, authenticated;

create or replace function public.public_part_facets()
returns table (kind text, value text, n bigint)
language sql stable security definer set search_path = public
as $$
  with p as (select * from public.parts where show_on_website and status in ('available', 'reserved'))
  select 'category', min(category), count(*) from p where category is not null and category <> '' group by lower(category)
  union all
  select 'make', min(make), count(*) from p where make is not null and make <> '' group by lower(make)
  union all
  select 'total', null, count(*) from p
$$;
grant execute on function public.public_part_facets() to anon, authenticated;
