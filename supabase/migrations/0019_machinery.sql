-- =====================================================================
-- 0019 — Heavy machinery (excavators, loaders, cranes, forklifts…)
--   • machinery + machinery_images (vehicle-images bucket, machinery/<id>/…)
--   • same branch / local-currency cost model as vehicles
--   • public_machinery / public_machine / public_machinery_facets (no cost, no notes)
--   • public_branches counts machines; sitemap lists machine pages
-- Run after 0001–0018. Safe to re-run.
-- =====================================================================

create table if not exists public.machinery (
  id                   uuid primary key default gen_random_uuid(),
  stock_no             text not null unique,                 -- e.g. "M-2001"
  category             text,                                 -- Excavator, Wheel loader, Bulldozer, Crane…
  make                 text not null,
  model                text not null,
  year                 int check (year between 1950 and 2100),
  hours                int check (hours >= 0),               -- working hours
  serial_no            text,
  operating_weight_kg  numeric(10, 1) check (operating_weight_kg >= 0),
  engine_power_hp      numeric(8, 1) check (engine_power_hp >= 0),
  bucket_capacity_m3   numeric(6, 2) check (bucket_capacity_m3 >= 0),
  attachments          text,
  condition            text not null default 'used' check (condition in ('new', 'used', 'rebuilt')),
  location             text,
  branch               text not null default 'JP' references public.branches (code) on update cascade,
  cost_currency        text not null default 'JPY' check (cost_currency in ('JPY', 'USD', 'EUR', 'GBP', 'SGD', 'TWD', 'THB')),
  cost_fx_rate         numeric(14, 6) not null default 1 check (cost_fx_rate > 0 and (cost_currency <> 'JPY' or cost_fx_rate = 1)),
  purchase_price       numeric(14, 2) check (purchase_price is null or purchase_price >= 0),   -- cost_currency
  expenses             numeric(14, 2) check (expenses is null or expenses >= 0),               -- cost_currency
  cost_total_jpy       numeric(16, 2) generated always as (round((coalesce(purchase_price, 0) + coalesce(expenses, 0)) * cost_fx_rate, 0)) stored,
  price                numeric(14, 2) check (price is null or price >= 0),
  price_currency       text not null default 'USD' check (price_currency in ('JPY', 'USD', 'EUR', 'GBP', 'SGD', 'TWD', 'THB')),
  status               public.vehicle_status not null default 'in_stock',
  show_on_website      boolean not null default true,
  description          text,
  notes                text,                                 -- internal
  created_by           uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists machinery_public_idx on public.machinery (show_on_website, status, created_at desc);
create index if not exists machinery_category_idx on public.machinery (lower(category));
create index if not exists machinery_make_idx on public.machinery (lower(make));
create index if not exists machinery_branch_idx on public.machinery (branch);
create index if not exists machinery_created_by_idx on public.machinery (created_by);

drop trigger if exists machinery_touch on public.machinery;
create trigger machinery_touch before update on public.machinery
  for each row execute function public.touch_updated_at();

create table if not exists public.machinery_images (
  id            uuid primary key default gen_random_uuid(),
  machinery_id  uuid not null references public.machinery (id) on delete cascade,
  path          text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists machinery_images_idx on public.machinery_images (machinery_id, sort_order);

alter table public.machinery enable row level security;
alter table public.machinery_images enable row level security;

drop policy if exists machinery_read on public.machinery;
create policy machinery_read on public.machinery for select to authenticated using ((select public.auth_role()) is not null);
drop policy if exists machinery_ins on public.machinery;
create policy machinery_ins on public.machinery for insert to authenticated
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists machinery_upd on public.machinery;
create policy machinery_upd on public.machinery for update to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])))
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists machinery_del on public.machinery;
create policy machinery_del on public.machinery for delete to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])));

drop policy if exists mimg_read on public.machinery_images;
create policy mimg_read on public.machinery_images for select to authenticated using ((select public.auth_role()) is not null);
drop policy if exists mimg_ins on public.machinery_images;
create policy mimg_ins on public.machinery_images for insert to authenticated
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists mimg_upd on public.machinery_images;
create policy mimg_upd on public.machinery_images for update to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])))
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists mimg_del on public.machinery_images;
create policy mimg_del on public.machinery_images for delete to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])));

-- ---------------------------------------------------------------------
-- Website
-- ---------------------------------------------------------------------
drop function if exists public.public_machinery(text, text, text, text, numeric, numeric, int, int, text, int, int);
create or replace function public.public_machinery(
  p_q text default null,
  p_category text default null,
  p_make text default null,
  p_branch text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_year int default null,
  p_max_year int default null,
  p_sort text default 'new',
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, stock_no text, category text, make text, model text, year int, hours int, operating_weight_kg numeric,
  engine_power_hp numeric, condition text, price numeric, price_currency text, status public.vehicle_status, location text,
  branch text, created_at timestamptz, total_count bigint, cover text, image_count int, images text[]
)
language sql stable security definer set search_path = public
as $$
  with page as (
    select m.*, count(*) over () as total
      from public.machinery m
     where m.show_on_website
       and m.status in ('in_stock', 'reserved', 'sold')
       and (p_q is null or p_q = '' or (m.stock_no || ' ' || m.make || ' ' || m.model || ' ' || coalesce(m.category, '') || ' ' || coalesce(m.serial_no, '')) ilike '%' || p_q || '%')
       and (p_category is null or p_category = '' or lower(m.category) = lower(p_category))
       and (p_make is null or p_make = '' or lower(m.make) = lower(p_make))
       and (p_branch is null or p_branch = '' or m.branch = upper(p_branch))
       and (p_min_price is null or m.price >= p_min_price)
       and (p_max_price is null or m.price <= p_max_price)
       and (p_min_year is null or m.year >= p_min_year)
       and (p_max_year is null or m.year <= p_max_year)
     order by (m.status = 'sold'),
              case when p_sort = 'price_asc' then coalesce(m.price, 1e12) end asc,
              case when p_sort = 'price_desc' then coalesce(m.price, -1) end desc,
              case when p_sort = 'year' then m.year end desc nulls last,
              case when p_sort = 'hours' then m.hours end asc nulls last,
              m.created_at desc
     limit least(greatest(coalesce(p_limit, 24), 1), 96)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select p.id, p.stock_no, p.category, p.make, p.model, p.year, p.hours, p.operating_weight_kg, p.engine_power_hp,
         p.condition, p.price, p.price_currency, p.status, p.location, p.branch, p.created_at, p.total,
         imgs.paths[1], coalesce(cardinality(imgs.paths), 0), coalesce(imgs.paths[1:5], '{}')
    from page p
    left join lateral (
      select array_agg(i.path order by i.sort_order, i.created_at) paths from public.machinery_images i where i.machinery_id = p.id
    ) imgs on true
   order by (p.status = 'sold'),
            case when p_sort = 'price_asc' then coalesce(p.price, 1e12) end asc,
            case when p_sort = 'price_desc' then coalesce(p.price, -1) end desc,
            case when p_sort = 'year' then p.year end desc nulls last,
            case when p_sort = 'hours' then p.hours end asc nulls last,
            p.created_at desc
$$;
grant execute on function public.public_machinery(text, text, text, text, numeric, numeric, int, int, text, int, int) to anon, authenticated;

drop function if exists public.public_machine(text);
create or replace function public.public_machine(p_key text)
returns table (
  id uuid, stock_no text, category text, make text, model text, year int, hours int, serial_no text, operating_weight_kg numeric,
  engine_power_hp numeric, bucket_capacity_m3 numeric, attachments text, condition text, location text, branch text,
  price numeric, price_currency text, status public.vehicle_status, description text, created_at timestamptz,
  updated_at timestamptz, images text[]
)
language sql stable security definer set search_path = public
as $$
  select m.id, m.stock_no, m.category, m.make, m.model, m.year, m.hours,
         -- never show the full serial number publicly
         case when m.serial_no is null then null
              when length(m.serial_no) > 4 then left(m.serial_no, length(m.serial_no) - 4) || '****'
              else m.serial_no end,
         m.operating_weight_kg, m.engine_power_hp, m.bucket_capacity_m3, m.attachments, m.condition, m.location, m.branch,
         m.price, m.price_currency, m.status, m.description, m.created_at, m.updated_at,
         coalesce((select array_agg(i.path order by i.sort_order, i.created_at) from public.machinery_images i where i.machinery_id = m.id), '{}')
    from public.machinery m
   where m.show_on_website
     and m.status in ('in_stock', 'reserved', 'sold')
     and upper(m.stock_no) = upper(p_key)
   limit 1
$$;
grant execute on function public.public_machine(text) to anon, authenticated;

create or replace function public.public_machinery_facets()
returns table (kind text, value text, n bigint)
language sql stable security definer set search_path = public
as $$
  with m as (select * from public.machinery where show_on_website and status in ('in_stock', 'reserved', 'sold'))
  select 'category', min(category), count(*) from m where category is not null and category <> '' group by lower(category)
  union all
  select 'make', min(make), count(*) from m group by lower(make)
  union all
  select 'total', null, count(*) from m
  union all
  select 'available', null, count(*) from m where status = 'in_stock'
$$;
grant execute on function public.public_machinery_facets() to anon, authenticated;

drop function if exists public.public_branches();
create or replace function public.public_branches()
returns table (code text, name text, n_cars bigint, n_parts bigint, n_machines bigint)
language sql stable security definer set search_path = public
as $$
  select b.code, b.name,
         (select count(*) from public.vehicles v where v.branch = b.code and v.show_on_website and v.status in ('in_stock', 'reserved', 'sold')),
         (select count(*) from public.parts p where p.branch = b.code and p.show_on_website and p.status in ('available', 'reserved')),
         (select count(*) from public.machinery m where m.branch = b.code and m.show_on_website and m.status in ('in_stock', 'reserved', 'sold'))
    from public.branches b
   where b.active
   order by b.sort_order, b.code
$$;
grant execute on function public.public_branches() to anon, authenticated;

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
  union all
  select 'machine', stock_no, updated_at from public.machinery
   where show_on_website and status in ('in_stock', 'reserved')
$$;
grant execute on function public.public_sitemap() to anon, authenticated;
