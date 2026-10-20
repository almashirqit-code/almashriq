-- =====================================================================
-- Al Mashriq ERP — third-party (consignment) vehicles + public showroom
-- Run in Supabase SQL editor after 0001_init.sql. Safe to re-run.
-- =====================================================================

alter table public.vehicles
  add column if not exists ownership         text not null default 'own',
  add column if not exists supplier_name     text,
  add column if not exists supplier_contact  text,
  add column if not exists supplier_price    numeric(14, 2),
  add column if not exists supplier_currency text not null default 'JPY',
  add column if not exists show_on_website   boolean not null default true;

do $$ begin
  alter table public.vehicles add constraint vehicles_ownership_chk check (ownership in ('own', 'third_party'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.vehicles add constraint vehicles_supplier_currency_chk check (supplier_currency in ('JPY', 'USD', 'EUR', 'GBP'));
exception when duplicate_object then null; end $$;

create index if not exists vehicles_ownership_idx on public.vehicles (ownership);

-- Public showroom: only safe columns, only vehicles marked for the website
-- that are still available. Costs, suppliers and ownership are never exposed.
drop function if exists public.showcase_vehicles();
create or replace function public.showcase_vehicles()
returns table (
  id uuid,
  stock_no text,
  make text,
  model text,
  grade text,
  year int,
  month int,
  mileage int,
  color text,
  engine_cc int,
  fuel text,
  transmission text,
  drive text,
  steering text,
  doors int,
  seats int,
  body_type text,
  auction_grade text,
  price numeric,
  price_currency text,
  status public.vehicle_status,
  images text[],
  created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.stock_no, v.make, v.model, v.grade, v.year, v.month, v.mileage, v.color, v.engine_cc,
         v.fuel, v.transmission, v.drive, v.steering, v.doors, v.seats, v.body_type, v.auction_grade,
         v.price, v.price_currency, v.status,
         coalesce((select array_agg(i.path order by i.sort_order, i.created_at)
                     from public.vehicle_images i where i.vehicle_id = v.id), '{}'),
         v.created_at
    from public.vehicles v
   where v.show_on_website and v.status in ('in_stock', 'reserved')
   order by v.created_at desc
$$;

grant execute on function public.showcase_vehicles() to anon, authenticated;

-- Company name/contact for the public page header (no bank details, no rates).
create or replace function public.showcase_company()
returns table (company_name text, company_name_ja text, phone text, email text, website text, logo_url text, address text)
language sql stable security definer set search_path = public
as $$
  select company_name, company_name_ja, phone, email, website, logo_url, address from public.settings where id = 1
$$;

grant execute on function public.showcase_company() to anon, authenticated;

-- =====================================================================
-- Customers: unique email & phone, at least one required, consignee details
-- =====================================================================

alter table public.customers
  add column if not exists consignee_name     text,
  add column if not exists consignee_address  text,
  add column if not exists consignee_phone    text,
  add column if not exists consignee_email    text,
  add column if not exists notify_party       text;

-- Normalise what's already there so the unique indexes can be built.
update public.customers set email = nullif(lower(trim(email)), '') where email is distinct from nullif(lower(trim(email)), '');
update public.customers set phone = nullif(trim(phone), '') where phone is distinct from nullif(trim(phone), '');

-- Email: unique, case-insensitive.
create unique index if not exists customers_email_uniq
  on public.customers (lower(email)) where email is not null;

-- Phone: unique on digits only, so "+81 90-1234-5678" and "819012345678" clash.
create unique index if not exists customers_phone_uniq
  on public.customers ((regexp_replace(phone, '\D', '', 'g')))
  where phone is not null and regexp_replace(phone, '\D', '', 'g') <> '';

-- Every customer needs an email or a phone (existing rows are not re-checked).
do $$ begin
  alter table public.customers add constraint customers_contact_required
    check (email is not null or phone is not null) not valid;
exception when duplicate_object then null; end $$;

-- Invoices keep their own copy of the consignee, so later edits to the
-- customer don't change documents already issued.
alter table public.invoices
  add column if not exists consignee_name     text,
  add column if not exists consignee_address  text,
  add column if not exists consignee_phone    text,
  add column if not exists notify_party       text;

-- =====================================================================
-- Vehicles bought for parts (shown with a "Parts" badge)
-- =====================================================================
alter table public.vehicles add column if not exists for_parts boolean not null default false;

-- Re-create the showroom function to include the flag (buyers should know).
drop function if exists public.showcase_vehicles();
create or replace function public.showcase_vehicles()
returns table (
  id uuid, stock_no text, make text, model text, grade text, year int, month int, mileage int,
  color text, engine_cc int, fuel text, transmission text, drive text, steering text, doors int,
  seats int, body_type text, auction_grade text, price numeric, price_currency text,
  status public.vehicle_status, for_parts boolean, images text[], created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.stock_no, v.make, v.model, v.grade, v.year, v.month, v.mileage, v.color, v.engine_cc,
         v.fuel, v.transmission, v.drive, v.steering, v.doors, v.seats, v.body_type, v.auction_grade,
         v.price, v.price_currency, v.status, v.for_parts,
         coalesce((select array_agg(i.path order by i.sort_order, i.created_at)
                     from public.vehicle_images i where i.vehicle_id = v.id), '{}'),
         v.created_at
    from public.vehicles v
   where v.show_on_website and v.status in ('in_stock', 'reserved')
   order by v.created_at desc
$$;
grant execute on function public.showcase_vehicles() to anon, authenticated;
