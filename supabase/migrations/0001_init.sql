-- =====================================================================
-- Al Mashriq ERP — initial schema
-- Run in Supabase SQL editor (or `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'manager', 'sales');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vehicle_status as enum ('in_stock', 'reserved', 'sold', 'shipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.user_role not null default 'sales',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Role of the signed-in user (security definer avoids RLS recursion)
create or replace function public.auth_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff(roles public.user_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.auth_role() = any (roles), false)
$$;

-- New auth user → profile. The very first user becomes admin; everyone else
-- starts as 'sales' (admins promote from the Users page). Role is never taken
-- from client-supplied metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when is_first then 'admin'::public.user_role else 'sales'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                 int primary key default 1 check (id = 1),
  company_name       text not null default 'Al Mashriq Trading',
  company_name_ja    text,
  address            text,
  phone              text,
  email              text,
  website            text,
  logo_url           text,
  bank_details       text,
  default_currency   text not null default 'USD' check (default_currency in ('JPY', 'USD', 'EUR', 'GBP')),
  invoice_prefix     text not null default 'AM',
  next_invoice_no    int  not null default 1,
  tax_rate           numeric(6, 3) not null default 0,
  invoice_terms      text default 'Payment due within 7 days. Vehicle will be shipped after full payment is received.',
  -- 1 unit of currency = N JPY
  exchange_rates     jsonb not null default '{"JPY":1,"USD":150,"EUR":163,"GBP":191}'::jsonb,
  updated_at         timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text,
  country     text,
  port        text,
  email       text,
  phone       text,
  whatsapp    text,
  address     text,
  notes       text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists customers_name_idx on public.customers (lower(name));

-- ---------------------------------------------------------------------
-- Vehicles (stock)
-- ---------------------------------------------------------------------
create table if not exists public.vehicles (
  id               uuid primary key default gen_random_uuid(),
  stock_no         text not null unique,
  chassis_no       text unique,
  make             text not null,
  model            text not null,
  grade            text,
  year             int,
  month            int check (month between 1 and 12),
  mileage          int,
  color            text,
  engine_cc        int,
  fuel             text,
  transmission     text,
  drive            text,
  steering         text default 'RHD',
  doors            int,
  seats            int,
  body_type        text,
  auction_grade    text,
  location         text,
  purchase_date    date,
  purchase_price   numeric(14, 2) default 0,   -- JPY
  expenses         numeric(14, 2) default 0,   -- JPY (transport, repairs, auction fees)
  price            numeric(14, 2),             -- asking price
  price_currency   text not null default 'JPY' check (price_currency in ('JPY', 'USD', 'EUR', 'GBP')),
  status           public.vehicle_status not null default 'in_stock',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists vehicles_make_model_idx on public.vehicles (make, model);

create table if not exists public.vehicle_images (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  path        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists vehicle_images_vehicle_idx on public.vehicle_images (vehicle_id, sort_order);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists vehicles_touch on public.vehicles;
create trigger vehicles_touch before update on public.vehicles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------
create table if not exists public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  invoice_no         text not null unique,
  customer_id        uuid not null references public.customers (id) on delete restrict,
  issue_date         date not null default current_date,
  due_date           date,
  currency           text not null default 'USD' check (currency in ('JPY', 'USD', 'EUR', 'GBP')),
  exchange_rate      numeric(14, 6) not null default 1,  -- 1 unit of currency = N JPY
  status             public.invoice_status not null default 'draft',
  incoterm           text default 'FOB',
  port_of_loading    text,
  port_of_discharge  text,
  notes              text,
  subtotal           numeric(14, 2) not null default 0,
  discount           numeric(14, 2) not null default 0,
  tax_rate           numeric(6, 3)  not null default 0,
  tax                numeric(14, 2) not null default 0,
  total              numeric(14, 2) not null default 0,
  amount_paid        numeric(14, 2) not null default 0,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists invoices_customer_idx on public.invoices (customer_id);
create index if not exists invoices_issue_date_idx on public.invoices (issue_date);

drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

create table if not exists public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  vehicle_id   uuid references public.vehicles (id) on delete set null,
  description  text not null,
  quantity     numeric(10, 2) not null default 1,
  unit_price   numeric(14, 2) not null default 0,
  amount       numeric(14, 2) not null default 0,
  sort_order   int not null default 0
);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index if not exists invoice_items_vehicle_idx on public.invoice_items (vehicle_id);

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  paid_on     date not null default current_date,
  amount      numeric(14, 2) not null check (amount > 0),
  method      text,
  reference   text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists payments_invoice_idx on public.payments (invoice_id);

-- Atomic invoice number: PREFIX-YYYY-0001
create or replace function public.next_invoice_number()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  n int;
  p text;
begin
  if public.auth_role() is null then
    raise exception 'not authorized';
  end if;
  update public.settings
     set next_invoice_no = next_invoice_no + 1
   where id = 1
  returning next_invoice_no - 1, invoice_prefix into n, p;
  return p || '-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 4, '0');
end $$;

-- Keep vehicle status in sync with the invoices that contain them.
create or replace function public.sync_vehicle_status(v_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  best public.invoice_status;
  cur  public.vehicle_status;
begin
  if v_id is null then return; end if;
  select status into cur from public.vehicles where id = v_id;
  if cur = 'shipped' then return; end if;

  select i.status into best
    from public.invoice_items it
    join public.invoices i on i.id = it.invoice_id
   where it.vehicle_id = v_id and i.status <> 'cancelled'
   order by case i.status when 'paid' then 1 when 'partially_paid' then 2 when 'issued' then 3 else 4 end
   limit 1;

  update public.vehicles
     set status = case
                    when best is null then 'in_stock'::public.vehicle_status
                    when best = 'draft' then 'reserved'::public.vehicle_status
                    else 'sold'::public.vehicle_status
                  end
   where id = v_id;
end $$;

create or replace function public.trg_items_sync()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_vehicle_status(new.vehicle_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.sync_vehicle_status(old.vehicle_id);
  end if;
  return null;
end $$;

drop trigger if exists invoice_items_sync on public.invoice_items;
create trigger invoice_items_sync after insert or update or delete on public.invoice_items
  for each row execute function public.trg_items_sync();

create or replace function public.trg_invoice_status_sync()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  if new.status is distinct from old.status then
    for r in select distinct vehicle_id from public.invoice_items where invoice_id = new.id and vehicle_id is not null loop
      perform public.sync_vehicle_status(r.vehicle_id);
    end loop;
  end if;
  return null;
end $$;

drop trigger if exists invoices_status_sync on public.invoices;
create trigger invoices_status_sync after update on public.invoices
  for each row execute function public.trg_invoice_status_sync();

-- Payments → amount_paid + status
create or replace function public.trg_payments_rollup()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  inv_id uuid := coalesce(new.invoice_id, old.invoice_id);
  paid numeric;
begin
  select coalesce(sum(amount), 0) into paid from public.payments where invoice_id = inv_id;
  update public.invoices i
     set amount_paid = paid,
         status = case
                    when i.status in ('draft', 'cancelled') then i.status
                    when paid >= i.total and i.total > 0 then 'paid'::public.invoice_status
                    when paid > 0 then 'partially_paid'::public.invoice_status
                    else 'issued'::public.invoice_status
                  end
   where i.id = inv_id;
  return null;
end $$;

drop trigger if exists payments_rollup on public.payments;
create trigger payments_rollup after insert or update or delete on public.payments
  for each row execute function public.trg_payments_rollup();

-- ---------------------------------------------------------------------
-- Row Level Security
--   admin   : everything
--   manager : stock, customers, invoices (no users/settings writes)
--   sales   : read stock, manage customers & invoices (no deletes)
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.settings        enable row level security;
alter table public.customers       enable row level security;
alter table public.vehicles        enable row level security;
alter table public.vehicle_images  enable row level security;
alter table public.invoices        enable row level security;
alter table public.invoice_items   enable row level security;
alter table public.payments        enable row level security;

-- profiles
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.auth_role() is not null);
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for update to authenticated
  using (public.is_staff(array['admin']::public.user_role[]))
  with check (public.is_staff(array['admin']::public.user_role[]));

-- settings
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for update to authenticated
  using (public.is_staff(array['admin']::public.user_role[]))
  with check (public.is_staff(array['admin']::public.user_role[]));

-- customers
drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated
  with check (public.auth_role() is not null);
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
  using (public.auth_role() is not null) with check (public.auth_role() is not null);
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]));

-- vehicles
drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists vehicles_insert on public.vehicles;
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (public.is_staff(array['admin','manager']::public.user_role[]));
drop policy if exists vehicles_update on public.vehicles;
create policy vehicles_update on public.vehicles for update to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));
drop policy if exists vehicles_delete on public.vehicles;
create policy vehicles_delete on public.vehicles for delete to authenticated
  using (public.is_staff(array['admin']::public.user_role[]));

-- vehicle_images
drop policy if exists vimg_read on public.vehicle_images;
create policy vimg_read on public.vehicle_images for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists vimg_write on public.vehicle_images;
create policy vimg_write on public.vehicle_images for all to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));

-- invoices
drop policy if exists invoices_read on public.invoices;
create policy invoices_read on public.invoices for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices for insert to authenticated
  with check (public.auth_role() is not null);
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update to authenticated
  using (public.auth_role() is not null) with check (public.auth_role() is not null);
drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices for delete to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]));

-- invoice_items
drop policy if exists items_read on public.invoice_items;
create policy items_read on public.invoice_items for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists items_write on public.invoice_items;
create policy items_write on public.invoice_items for all to authenticated
  using (public.auth_role() is not null) with check (public.auth_role() is not null);

-- payments
drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check (public.auth_role() is not null);
drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments for delete to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]));

-- ---------------------------------------------------------------------
-- Storage: public bucket for vehicle photos and the company logo
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do update set public = true;

drop policy if exists "vehicle images read" on storage.objects;
create policy "vehicle images read" on storage.objects for select
  using (bucket_id = 'vehicle-images');

drop policy if exists "vehicle images insert" on storage.objects;
create policy "vehicle images insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-images' and public.is_staff(array['admin','manager']::public.user_role[]));

drop policy if exists "vehicle images update" on storage.objects;
create policy "vehicle images update" on storage.objects for update to authenticated
  using (bucket_id = 'vehicle-images' and public.is_staff(array['admin','manager']::public.user_role[]));

drop policy if exists "vehicle images delete" on storage.objects;
create policy "vehicle images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-images' and public.is_staff(array['admin','manager']::public.user_role[]));

-- Grants for RPCs
grant execute on function public.next_invoice_number() to authenticated;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.is_staff(public.user_role[]) to authenticated;

-- Backfill profiles for any auth users created before this migration ran.
-- The earliest existing user becomes admin.
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
       case when row_number() over (order by u.created_at) = 1 then 'admin'::public.user_role else 'sales'::public.user_role end
from auth.users u
on conflict (id) do nothing;
