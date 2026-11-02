-- Public keyword search: match every word, in any order.
-- The search boxes used one `ilike '%query%'`, so "toyota allion" found 78 cars but "allion toyota",
-- "toyota  allion" (two spaces), "prius 2015" and "am36175" (stock ID without the dash) found none.
-- search_words_match() lowercases both sides, ignores spaces and punctuation, and requires each word
-- of the query to appear somewhere in the text. Year, body type, fuel and colour are now searchable
-- too. The four functions below are unchanged apart from their keyword line. Re-runnable.

create or replace function public.search_words_match(p_text text, p_q text)
returns boolean
language sql immutable parallel safe set search_path = pg_catalog
as $$
  select coalesce(bool_and(position(x.w in regexp_replace(lower(coalesce(p_text, '')), '[[:space:][:punct:]]+', '', 'g')) > 0), true)
    from regexp_split_to_table(lower(coalesce(p_q, '')), '[[:space:]]+') as t(raw)
    cross join lateral (select regexp_replace(t.raw, '[[:punct:]]+', '', 'g') as w) x
   where x.w <> ''
$$;

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
       and (p_q is null or p_q = '' or public.search_words_match(concat_ws(' ', v.stock_no, v.make, v.model, v.grade, v.model_code, v.chassis_no, v.year, v.body_type, v.fuel, v.color), p_q))
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
  unit_condition text, unit_parts text[], price numeric, price_currency text, cover text, image_count int,
  images text[], created_at timestamptz, total_count bigint
)
language sql stable security definer set search_path = public
as $$
  with f as (
    select v.*
      from public.vehicles v
     where v.show_on_website and v.for_parts
       and v.status in ('in_stock', 'reserved')
       and (p_q is null or p_q = '' or public.search_words_match(concat_ws(' ', v.stock_no, v.make, v.model, v.grade, v.model_code, v.year, v.body_type), p_q))
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
  oem_no text, condition text, quantity int, price numeric, price_currency text, description text, status text,
  created_at timestamptz, total_count bigint, branch text, cover text, image_count int, images text[]
)
language sql stable security definer set search_path = public
as $$
  with page as (
    select p.*, count(*) over () as total
      from public.parts p
     where p.show_on_website
       and p.status in ('available', 'reserved')
       and (p_q is null or p_q = '' or public.search_words_match(concat_ws(' ', p.part_no, p.name, p.make, p.model, p.model_code, p.oem_no, p.category), p_q))
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
  engine_power_hp numeric, condition text, price numeric, price_currency text, status public.vehicle_status,
  location text, branch text, created_at timestamptz, total_count bigint, cover text, image_count int, images text[]
)
language sql stable security definer set search_path = public
as $$
  with page as (
    select m.*, count(*) over () as total
      from public.machinery m
     where m.show_on_website
       and m.status in ('in_stock', 'reserved', 'sold')
       and (p_q is null or p_q = '' or public.search_words_match(concat_ws(' ', m.stock_no, m.make, m.model, m.category, m.serial_no, m.year), p_q))
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
