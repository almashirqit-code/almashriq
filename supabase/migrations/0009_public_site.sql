-- =====================================================================
-- 0009 — Public website: extra vehicle fields + fast public queries
-- Run after 0001–0008. Safe to re-run.
-- =====================================================================

alter table public.vehicles
  add column if not exists model_code text,
  add column if not exists features   text[] not null default '{}',
  add column if not exists source_ref text,      -- e.g. "site:36161" for cars imported from the old website
  add column if not exists source_url text;
create unique index if not exists vehicles_source_ref_key on public.vehicles (source_ref) where source_ref is not null;
create index if not exists vehicles_public_idx on public.vehicles (show_on_website, status, created_at desc);
create index if not exists vehicles_make_idx on public.vehicles (lower(make));

-- ---------------------------------------------------------------------
-- Listing with filters + paging. Only cars marked "show on website";
-- sold cars are listed after available ones (shown with a Sold ribbon).
-- ---------------------------------------------------------------------
drop function if exists public.public_vehicles(text, text, text, text, text, text, numeric, numeric, int, int, text, int, int);
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
  p_offset int default 0
)
returns table (
  id uuid, stock_no text, make text, model text, grade text, year int, mileage int, engine_cc int,
  fuel text, transmission text, steering text, body_type text, color text, price numeric, price_currency text,
  status public.vehicle_status, for_parts boolean, location text, cover text, image_count int, created_at timestamptz,
  total_count bigint
)
language sql stable security definer set search_path = public
as $$
  with f as (
    select v.*
      from public.vehicles v
     where v.show_on_website
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
  )
  select f.id, f.stock_no, f.make, f.model, f.grade, f.year, f.mileage, f.engine_cc, f.fuel, f.transmission, f.steering,
         f.body_type, f.color, f.price, f.price_currency, f.status, f.for_parts, f.location,
         (select i.path from public.vehicle_images i where i.vehicle_id = f.id order by i.sort_order, i.created_at limit 1),
         (select count(*)::int from public.vehicle_images i where i.vehicle_id = f.id),
         f.created_at,
         count(*) over ()
    from f
   order by (f.status = 'sold'),
            case when p_sort = 'price_asc' then coalesce(f.price, 1e12) end asc,
            case when p_sort = 'price_desc' then coalesce(f.price, -1) end desc,
            case when p_sort = 'year' then f.year end desc nulls last,
            f.created_at desc
   limit least(greatest(coalesce(p_limit, 24), 1), 96)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
grant execute on function public.public_vehicles(text, text, text, text, text, text, numeric, numeric, int, int, text, int, int) to anon, authenticated;

-- Filter counts (make, body type, fuel, transmission, steering)
create or replace function public.public_facets()
returns table (kind text, value text, n bigint)
language sql stable security definer set search_path = public
as $$
  with v as (
    select * from public.vehicles where show_on_website and status in ('in_stock', 'reserved', 'sold')
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

-- One car, by stock no. or old-website reference ("site:36161")
drop function if exists public.public_vehicle(text);
create or replace function public.public_vehicle(p_key text)
returns table (
  id uuid, stock_no text, make text, model text, grade text, model_code text, year int, month int, mileage int,
  engine_cc int, fuel text, transmission text, drive text, steering text, doors int, seats int, body_type text,
  color text, chassis_no text, location text, price numeric, price_currency text, status public.vehicle_status,
  for_parts boolean, features text[], images text[], created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.stock_no, v.make, v.model, v.grade, v.model_code, v.year, v.month, v.mileage, v.engine_cc, v.fuel,
         v.transmission, v.drive, v.steering, v.doors, v.seats, v.body_type, v.color,
         -- never show the full chassis number publicly
         case when v.chassis_no is null then null
              when length(v.chassis_no) > 4 then left(v.chassis_no, length(v.chassis_no) - 4) || '****'
              else v.chassis_no end,
         v.location, v.price, v.price_currency, v.status, v.for_parts, v.features,
         coalesce((select array_agg(i.path order by i.sort_order, i.created_at) from public.vehicle_images i where i.vehicle_id = v.id), '{}'),
         v.created_at
    from public.vehicles v
   where v.show_on_website
     and v.status in ('in_stock', 'reserved', 'sold')
     and (upper(v.stock_no) = upper(p_key) or v.source_ref = p_key)
   limit 1
$$;
grant execute on function public.public_vehicle(text) to anon, authenticated;

-- Company details for the public website (contact only — no bank details or rates)
create or replace function public.public_company()
returns table (company_name text, phone text, mobile text, fax text, email text, website text, logo_url text, address text)
language sql stable security definer set search_path = public
as $$
  select company_name, phone, mobile, fax, email, website, logo_url, address from public.settings where id = 1
$$;
grant execute on function public.public_company() to anon, authenticated;
