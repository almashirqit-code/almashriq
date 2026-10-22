-- =====================================================================
-- 0023: complete units (cars bought for parts)
--
--  * vehicles.unit_condition / unit_parts: condition of the unit and what it can be
--    dismantled into (half cut, nose cut, engine, battery, doors…; see src/lib/part-units.ts).
--  * Cars with for_parts = true leave the public car list, filters, make counts and the car
--    part of the sitemap; they are shown under Parts → Complete units instead
--    (public_part_units / public_part_unit / public_part_unit_facets).
-- =====================================================================

alter table public.vehicles
  add column if not exists unit_condition text,
  add column if not exists unit_parts     text[] not null default '{}';

create index if not exists vehicles_for_parts_idx on public.vehicles (created_at desc) where for_parts and show_on_website;

-- ---------------------------------------------------------------------
-- Car list (same as 0017, plus "not for_parts")
-- ---------------------------------------------------------------------
create or replace function public.public_vehicles(
  p_q text default null,
  p_make text default null,
  p_body text default null,
  p_fuel text default null,
  p_trans text default null,
  p_steering text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_year int default null,
  p_max_year int default null,
  p_sort text default 'new',
  p_limit int default 24,
  p_offset int default 0,
  p_branch text default null
)
returns table (
  id uuid, stock_no text, make text, model text, grade text, year int, mileage int, engine_cc int,
  fuel text, transmission text, steering text, body_type text, color text, price numeric, price_currency text,
  status public.vehicle_status, for_parts boolean, location text, cover text, image_count int, created_at timestamptz,
  total_count bigint, images text[], branch text
)
language sql stable security definer set search_path = public
as $$
  with f as (
    select v.*
      from public.vehicles v
     where v.show_on_website
       and not v.for_parts
       and v.status in ('in_stock', 'reserved', 'sold')
       and (p_q is null or p_q = '' or (v.stock_no || ' ' || v.make || ' ' || v.model || ' ' || coalesce(v.grade, '') || ' ' || coalesce(v.model_code, '') || ' ' || coalesce(v.chassis_no, '')) ilike '%' || p_q || '%')
       and (p_make is null or p_make = '' or lower(v.make) = lower(p_make))
       and (p_body is null or p_body = '' or lower(v.body_type) = lower(p_body))
       and (p_fuel is null or p_fuel = '' or lower(v.fuel) = lower(p_fuel))
       and (p_trans is null or p_trans = '' or lower(v.transmission) = lower(p_trans))
       and (p_steering is null or p_steering = '' or lower(v.steering) = lower(p_steering))
       and (p_min_price is null or v.price >= p_min_price)
       and (p_max_price is null or v.price <= p_max_price)
       and (p_min_year is null or v.year >= p_min_year)
       and (p_max_year is null or v.year <= p_max_year)
       and (p_branch is null or p_branch = '' or v.branch = upper(p_branch))
  ), page as (
    select f.*, count(*) over () as total
      from f
     order by (f.status = 'sold'),
              case when p_sort = 'price_asc' then coalesce(f.price, 1e12) end asc,
              case when p_sort = 'price_desc' then coalesce(f.price, -1) end desc,
              case when p_sort = 'year' then f.year end desc nulls last,
              f.created_at desc
     limit least(greatest(coalesce(p_limit, 24), 1), 96)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select p.id, p.stock_no, p.make, p.model, p.grade, p.year, p.mileage, p.engine_cc, p.fuel, p.transmission, p.steering,
         p.body_type, p.color, p.price, p.price_currency, p.status, p.for_parts, p.location,
         imgs.paths[1],
         (select count(*)::int from public.vehicle_images i where i.vehicle_id = p.id),
         p.created_at, p.total,
         coalesce(imgs.paths[1:5], '{}'),
         p.branch
    from page p
    left join lateral (
      select array_agg(i.path order by i.sort_order, i.created_at) paths from public.vehicle_images i where i.vehicle_id = p.id
    ) imgs on true
   order by (p.status = 'sold'),
            case when p_sort = 'price_asc' then coalesce(p.price, 1e12) end asc,
            case when p_sort = 'price_desc' then coalesce(p.price, -1) end desc,
            case when p_sort = 'year' then p.year end desc nulls last,
            p.created_at desc
$$;
grant execute on function public.public_vehicles(text, text, text, text, text, text, numeric, numeric, int, int, text, int, int, text) to anon, authenticated;

-- Car filters and counts (same as 0009, plus "not for_parts")
create or replace function public.public_facets()
returns table (kind text, value text, n bigint)
language sql stable security definer set search_path = public
as $$
  with v as (
    select * from public.vehicles where show_on_website and not for_parts and status in ('in_stock', 'reserved', 'sold')
  )
  select 'make', initcap(lower(make)), count(*) from v group by 1, 2
  union all select 'body', upper(body_type), count(*) from v where body_type is not null group by 1, 2
  union all select 'fuel', upper(fuel), count(*) from v where fuel is not null group by 1, 2
  union all select 'transmission', upper(transmission), count(*) from v where transmission is not null group by 1, 2
  union all select 'steering', upper(steering), count(*) from v where steering is not null group by 1, 2
  union all select 'total', null, count(*) from v
  union all select 'available', null, count(*) from v where status = 'in_stock'
$$;
grant execute on function public.public_facets() to anon, authenticated;

-- Make tiles (same as 0011, plus "not for_parts")
create or replace function public.public_makes()
returns table (make text, label text, logo_path text, n bigint, featured boolean, sort_order int)
language sql stable security definer set search_path = public
as $$
  with c as (
    select lower(make) mk, initcap(lower(make)) lbl, count(*) n
      from public.vehicles
     where show_on_website and not for_parts and status in ('in_stock', 'reserved', 'sold')
     group by 1, 2
  )
  select c.mk, coalesce(m.label, c.lbl), m.logo_path, c.n, coalesce(m.featured, true), coalesce(m.sort_order, 100)
    from c left join public.make_logos m on m.make = c.mk
   order by coalesce(m.sort_order, 100), c.n desc
$$;
grant execute on function public.public_makes() to anon, authenticated;

-- Sitemap (same as 0019; cars exclude units, units listed as kind 'unit')
create or replace function public.public_sitemap()
returns table (kind text, key text, updated timestamptz)
language sql stable security definer set search_path = public
as $$
  select 'car', stock_no, coalesce(updated_at, created_at) from public.vehicles
   where show_on_website and not for_parts and status in ('in_stock', 'reserved')
  union all
  select 'unit', stock_no, coalesce(updated_at, created_at) from public.vehicles
   where show_on_website and for_parts and status in ('in_stock', 'reserved')
  union all
  select 'post', slug, updated_at from public.blog_posts where status = 'published' and published_at <= now()
  union all
  select 'make', lower(make), max(created_at) from public.vehicles
   where show_on_website and not for_parts and status in ('in_stock', 'reserved') group by lower(make)
  union all
  select 'part', part_no, updated_at from public.parts
   where show_on_website and status in ('available', 'reserved')
  union all
  select 'machine', stock_no, updated_at from public.machinery
   where show_on_website and status in ('in_stock', 'reserved')
$$;
grant execute on function public.public_sitemap() to anon, authenticated;

create or replace function public.public_sitemap_images()
returns table (kind text, key text, path text)
language sql stable security definer set search_path = public
as $$
  select case when v.for_parts then 'unit' else 'car' end, v.stock_no, i.path
    from public.vehicles v
    cross join lateral (
      select vi.path from public.vehicle_images vi where vi.vehicle_id = v.id order by vi.sort_order limit 3
    ) i
   where v.show_on_website and v.status in ('in_stock', 'reserved')
  union all
  select 'part', p.part_no, i.path
    from public.parts p
    cross join lateral (
      select pi.path from public.part_images pi where pi.part_id = p.id order by pi.sort_order limit 3
    ) i
   where p.show_on_website and p.status in ('available', 'reserved')
  union all
  select 'machine', m.stock_no, i.path
    from public.machinery m
    cross join lateral (
      select mi.path from public.machinery_images mi where mi.machinery_id = m.id order by mi.sort_order limit 3
    ) i
   where m.show_on_website and m.status in ('in_stock', 'reserved');
$$;
revoke all on function public.public_sitemap_images() from public;
grant execute on function public.public_sitemap_images() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Complete units (Parts → Complete units)
-- ---------------------------------------------------------------------
create or replace function public.public_part_units(
  p_q text default null,
  p_make text default null,
  p_part text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, stock_no text, make text, model text, grade text, model_code text, year int, mileage int, engine_cc int,
  fuel text, transmission text, body_type text, color text, branch text, status public.vehicle_status,
  unit_condition text, unit_parts text[], price numeric, price_currency text,
  cover text, image_count int, images text[], created_at timestamptz, total_count bigint
)
language sql stable security definer set search_path = public
as $$
  with f as (
    select v.*
      from public.vehicles v
     where v.show_on_website and v.for_parts
       and v.status in ('in_stock', 'reserved')
       and (p_q is null or p_q = '' or (v.stock_no || ' ' || v.make || ' ' || v.model || ' ' || coalesce(v.grade, '') || ' ' || coalesce(v.model_code, '')) ilike '%' || p_q || '%')
       and (p_make is null or p_make = '' or lower(v.make) = lower(p_make))
       and (p_part is null or p_part = '' or p_part = any (v.unit_parts))
  ), page as (
    select f.*, count(*) over () as total from f
     order by f.created_at desc
     limit least(greatest(coalesce(p_limit, 24), 1), 96)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select p.id, p.stock_no, p.make, p.model, p.grade, p.model_code, p.year, p.mileage, p.engine_cc, p.fuel, p.transmission,
         p.body_type, p.color, p.branch, p.status, p.unit_condition, p.unit_parts, p.price, p.price_currency,
         imgs.paths[1],
         (select count(*)::int from public.vehicle_images i where i.vehicle_id = p.id),
         coalesce(imgs.paths[1:5], '{}'),
         p.created_at, p.total
    from page p
    left join lateral (
      select array_agg(i.path order by i.sort_order, i.created_at) paths from public.vehicle_images i where i.vehicle_id = p.id
    ) imgs on true
   order by p.created_at desc
$$;
grant execute on function public.public_part_units(text, text, text, int, int) to anon, authenticated;

create or replace function public.public_part_unit(p_key text)
returns table (
  id uuid, stock_no text, make text, model text, grade text, model_code text, year int, month int, mileage int, engine_cc int,
  fuel text, transmission text, drive text, steering text, body_type text, color text, chassis_no text,
  location text, branch text, status public.vehicle_status, unit_condition text, unit_parts text[],
  price numeric, price_currency text, features text[], images text[], created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.stock_no, v.make, v.model, v.grade, v.model_code, v.year, v.month, v.mileage, v.engine_cc,
         v.fuel, v.transmission, v.drive, v.steering, v.body_type, v.color,
         -- never show the full chassis number publicly
         case when v.chassis_no is null then null
              when length(v.chassis_no) > 4 then left(v.chassis_no, length(v.chassis_no) - 4) || '****'
              else v.chassis_no end,
         v.location, v.branch, v.status, v.unit_condition, v.unit_parts, v.price, v.price_currency, v.features,
         coalesce((select array_agg(i.path order by i.sort_order, i.created_at) from public.vehicle_images i where i.vehicle_id = v.id), '{}'),
         v.created_at
    from public.vehicles v
   where v.show_on_website and v.for_parts
     and v.status in ('in_stock', 'reserved', 'sold')
     and upper(v.stock_no) = upper(p_key)
   limit 1
$$;
grant execute on function public.public_part_unit(text) to anon, authenticated;

-- Filter options for the Complete units page: makes and parts with counts
create or replace function public.public_part_unit_facets()
returns table (kind text, value text, n bigint)
language sql stable security definer set search_path = public
as $$
  with v as (
    select * from public.vehicles where show_on_website and for_parts and status in ('in_stock', 'reserved')
  )
  select 'make', initcap(lower(make)), count(*) from v group by 1, 2
  union all select 'part', p, count(*) from v, unnest(v.unit_parts) p group by 1, 2
  union all select 'total', null, count(*) from v
$$;
grant execute on function public.public_part_unit_facets() to anon, authenticated;
