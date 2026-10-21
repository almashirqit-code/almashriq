-- =====================================================================
-- 0017 — Source branches (Japan, Singapore, Taiwan, Thailand) and
--        local-currency costs converted to JPY
--   • branches: country, local currency, default purchase tax
--   • SGD / TWD / THB accepted everywhere a currency is stored
--   • vehicles & parts: branch + cost_currency + cost_fx_rate (1 unit = N JPY)
--     purchase_price / purchase_tax / expenses are in cost_currency;
--     cost_total_jpy is the JPY figure used for profit and stock value
--   • ports: branch (loading ports per country)
--   • public listing functions: branch filter + branch column
-- Run after 0001–0016. Safe to re-run.
-- =====================================================================

create table if not exists public.branches (
  code              text primary key check (code ~ '^[A-Z]{2}$'),
  name              text not null,
  currency          text not null,
  default_tax_rate  numeric(5, 2) not null default 0,
  sort_order        int not null default 100,
  active            boolean not null default true
);
insert into public.branches (code, name, currency, default_tax_rate, sort_order) values
  ('JP', 'Japan', 'JPY', 10, 1),
  ('SG', 'Singapore', 'SGD', 9, 2),
  ('TW', 'Taiwan', 'TWD', 5, 3),
  ('TH', 'Thailand', 'THB', 7, 4)
on conflict (code) do nothing;

alter table public.branches enable row level security;
drop policy if exists branches_read on public.branches;
create policy branches_read on public.branches for select using (true);
drop policy if exists branches_ins on public.branches;
create policy branches_ins on public.branches for insert to authenticated
  with check ((select public.is_staff(array['admin']::public.user_role[])));
drop policy if exists branches_upd on public.branches;
create policy branches_upd on public.branches for update to authenticated
  using ((select public.is_staff(array['admin']::public.user_role[])))
  with check ((select public.is_staff(array['admin']::public.user_role[])));

-- ---------------------------------------------------------------------
-- Currencies: JPY USD EUR GBP + SGD TWD THB
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  cur constant text := $c$('JPY', 'USD', 'EUR', 'GBP', 'SGD', 'TWD', 'THB')$c$;
begin
  for r in
    select * from (values
      ('settings', 'settings_default_currency_check', 'default_currency'),
      ('vehicles', 'vehicles_price_currency_check', 'price_currency'),
      ('vehicles', 'vehicles_supplier_currency_chk', 'supplier_currency'),
      ('invoices', 'invoices_currency_check', 'currency'),
      ('remittances', 'remittances_currency_check', 'currency'),
      ('freight_rates', 'freight_rates_currency_check', 'currency'),
      ('reservations', 'reservations_currency_check', 'currency'),
      ('vehicle_shipments', 'vehicle_shipments_freight_currency_check', 'freight_currency'),
      ('parts', 'parts_price_currency_check', 'price_currency')
    ) t(tbl, con, col)
  loop
    execute format('alter table public.%I drop constraint if exists %I', r.tbl, r.con);
    execute format('alter table public.%I add constraint %I check (%I in %s)', r.tbl, r.con, r.col, cur);
  end loop;
end $$;

alter table public.branches drop constraint if exists branches_currency_check;
alter table public.branches add constraint branches_currency_check check (currency in ('JPY', 'USD', 'EUR', 'GBP', 'SGD', 'TWD', 'THB'));

-- Default rates (JPY per 1 unit) for the new currencies; edit in Configuration
update public.settings
   set exchange_rates = jsonb_build_object('SGD', 112, 'TWD', 4.7, 'THB', 4.2) || coalesce(exchange_rates, '{}'::jsonb);

-- ---------------------------------------------------------------------
-- Vehicles: branch + local-currency cost
-- ---------------------------------------------------------------------
alter table public.vehicles
  add column if not exists branch        text not null default 'JP' references public.branches (code) on update cascade,
  add column if not exists cost_currency text not null default 'JPY',
  add column if not exists cost_fx_rate  numeric(14, 6) not null default 1;
alter table public.vehicles drop constraint if exists vehicles_cost_currency_chk;
alter table public.vehicles add constraint vehicles_cost_currency_chk check (cost_currency in ('JPY', 'USD', 'EUR', 'GBP', 'SGD', 'TWD', 'THB'));
alter table public.vehicles drop constraint if exists vehicles_cost_fx_chk;
alter table public.vehicles add constraint vehicles_cost_fx_chk check (cost_fx_rate > 0 and (cost_currency <> 'JPY' or cost_fx_rate = 1));
create index if not exists vehicles_branch_idx on public.vehicles (branch);

-- Total cost in JPY (cost fields are in cost_currency)
alter table public.vehicles
  add column if not exists cost_total_jpy numeric(16, 2) generated always as (
    round((coalesce(purchase_price, 0) + coalesce(purchase_tax, 0) + coalesce(expenses, 0)) * cost_fx_rate, 0)
  ) stored;

-- FOB (USD) now converts the local total to JPY first
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'vehicles' and column_name = 'fob_usd'
       and generation_expression ilike '%cost_fx_rate%'
  ) then
    alter table public.vehicles drop column if exists fob_usd;
    alter table public.vehicles
      add column fob_usd numeric(14, 2) generated always as (
        case when fob_fx_rate > 0
             then round((coalesce(purchase_price, 0) + coalesce(purchase_tax, 0) + coalesce(expenses, 0)) * cost_fx_rate / fob_fx_rate, 2)
        end
      ) stored;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Parts: branch + local-currency cost
-- ---------------------------------------------------------------------
alter table public.parts
  add column if not exists branch        text not null default 'JP' references public.branches (code) on update cascade,
  add column if not exists cost_currency text not null default 'JPY',
  add column if not exists cost_fx_rate  numeric(14, 6) not null default 1;
alter table public.parts drop constraint if exists parts_cost_currency_chk;
alter table public.parts add constraint parts_cost_currency_chk check (cost_currency in ('JPY', 'USD', 'EUR', 'GBP', 'SGD', 'TWD', 'THB'));
alter table public.parts drop constraint if exists parts_cost_fx_chk;
alter table public.parts add constraint parts_cost_fx_chk check (cost_fx_rate > 0 and (cost_currency <> 'JPY' or cost_fx_rate = 1));
create index if not exists parts_branch_idx on public.parts (branch);

-- ---------------------------------------------------------------------
-- Ports belong to a branch (loading ports per country)
-- ---------------------------------------------------------------------
alter table public.ports
  add column if not exists branch text not null default 'JP' references public.branches (code) on update cascade;
create index if not exists ports_branch_idx on public.ports (branch);

-- ---------------------------------------------------------------------
-- Website: branch filter + branch column
-- ---------------------------------------------------------------------
create or replace function public.public_branches()
returns table (code text, name text, n_cars bigint, n_parts bigint)
language sql stable security definer set search_path = public
as $$
  select b.code, b.name,
         (select count(*) from public.vehicles v where v.branch = b.code and v.show_on_website and v.status in ('in_stock', 'reserved', 'sold')),
         (select count(*) from public.parts p where p.branch = b.code and p.show_on_website and p.status in ('available', 'reserved'))
    from public.branches b
   where b.active
   order by b.sort_order, b.code
$$;
grant execute on function public.public_branches() to anon, authenticated;

drop function if exists public.public_vehicles(text, text, text, text, text, text, numeric, numeric, int, int, text, int, int);
drop function if exists public.public_vehicles(text, text, text, text, text, text, numeric, numeric, int, int, text, int, int, text);
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

drop function if exists public.public_vehicle(text);
create or replace function public.public_vehicle(p_key text)
returns table (
  id uuid, stock_no text, make text, model text, grade text, model_code text, year int, month int, mileage int, engine_cc int,
  fuel text, transmission text, drive text, steering text, doors int, seats int, body_type text, color text, chassis_no text,
  location text, price numeric, price_currency text, status public.vehicle_status, for_parts boolean, features text[], images text[],
  created_at timestamptz, branch text
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
         v.created_at, v.branch
    from public.vehicles v
   where v.show_on_website
     and v.status in ('in_stock', 'reserved', 'sold')
     and (upper(v.stock_no) = upper(p_key) or v.source_ref = p_key)
   limit 1
$$;
grant execute on function public.public_vehicle(text) to anon, authenticated;

drop function if exists public.public_parts(text, text, text, text, int, int);
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
  oem_no text, condition text, quantity int, price numeric, price_currency text, description text, photo_path text,
  status text, created_at timestamptz, total_count bigint, branch text
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.part_no, p.name, p.category, p.make, p.model, p.model_code, p.year_from, p.year_to,
         p.oem_no, p.condition, p.quantity, p.price, p.price_currency, p.description, p.photo_path,
         p.status, p.created_at, count(*) over (), p.branch
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
$$;
grant execute on function public.public_parts(text, text, text, text, int, int, text) to anon, authenticated;
