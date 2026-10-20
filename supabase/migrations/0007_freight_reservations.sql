-- =====================================================================
-- 0007 — Freight rates and vehicle reservations (with profit)
-- Run after 0001–0006. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Freight rates: loading port → destination, per shipment type
-- ---------------------------------------------------------------------
create table if not exists public.freight_rates (
  id             uuid primary key default gen_random_uuid(),
  port_id        uuid references public.ports (id) on delete restrict,   -- port of loading (null = any port)
  destination    text not null,                                          -- port of discharge, e.g. Karachi
  country        text,
  shipment_type  text not null check (shipment_type in ('roro', 'container_20', 'container_40')),
  amount         numeric(14, 2) not null check (amount >= 0),
  currency       text not null default 'USD' check (currency in ('JPY', 'USD', 'EUR', 'GBP')),
  valid_until    date,
  notes          text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
create unique index if not exists freight_rates_unique
  on public.freight_rates (coalesce(port_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(destination), shipment_type);
create index if not exists freight_rates_dest_idx on public.freight_rates (lower(destination));

-- ---------------------------------------------------------------------
-- Reservations
--   sold_price  = total agreed with the customer in `currency`
--                 (includes freight/insurance for C&F / CIF)
--   profit_jpy  = (sold_price − freight − insurance) × rate − buying cost
-- ---------------------------------------------------------------------
create table if not exists public.reservations (
  id                 uuid primary key default gen_random_uuid(),
  reservation_no     bigint generated always as identity,
  vehicle_id         uuid not null references public.vehicles (id) on delete cascade,
  customer_id        uuid not null references public.customers (id) on delete restrict,
  sales_agent_id     uuid references public.profiles (id) on delete set null,
  price_term         text not null default 'FOB' check (price_term in ('FOB', 'CNF', 'CIF')),
  shipment_type      text check (shipment_type in ('roro', 'container_20', 'container_40')),
  port_of_loading    text,
  port_of_discharge  text,
  freight_rate_id    uuid references public.freight_rates (id) on delete set null,
  currency           text not null default 'USD' check (currency in ('JPY', 'USD', 'EUR', 'GBP')),
  exchange_rate      numeric(14, 6) not null default 1 check (exchange_rate > 0),  -- 1 unit = N JPY
  sold_price         numeric(14, 2) not null check (sold_price >= 0),
  freight            numeric(14, 2) not null default 0 check (freight >= 0),
  insurance          numeric(14, 2) not null default 0 check (insurance >= 0),
  buying_cost_jpy    numeric(14, 0) not null default 0,   -- snapshot: buying price + tax + expenses
  profit_jpy         numeric(14, 0) generated always as
                       (round((sold_price - freight - insurance) * exchange_rate) - buying_cost_jpy) stored,
  reserved_until     date,
  status             text not null default 'active' check (status in ('active', 'invoiced', 'cancelled')),
  invoice_id         uuid references public.invoices (id) on delete set null,
  notes              text,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists reservations_one_active
  on public.reservations (vehicle_id) where status = 'active';
create index if not exists reservations_vehicle_idx on public.reservations (vehicle_id);
create index if not exists reservations_customer_idx on public.reservations (customer_id);
create index if not exists reservations_agent_idx on public.reservations (sales_agent_id);

create or replace function public.trg_reservations_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists reservations_touch on public.reservations;
create trigger reservations_touch before update on public.reservations
  for each row execute function public.trg_reservations_touch();

-- ---------------------------------------------------------------------
-- Vehicle status: invoices win; otherwise an active reservation = reserved
-- ---------------------------------------------------------------------
create or replace function public.sync_vehicle_status(v_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  best public.invoice_status;
  cur  public.vehicle_status;
  has_res boolean;
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

  select exists (select 1 from public.reservations r where r.vehicle_id = v_id and r.status = 'active') into has_res;

  update public.vehicles
     set status = case
                    when best is null and has_res then 'reserved'::public.vehicle_status
                    when best is null then 'in_stock'::public.vehicle_status
                    when best = 'draft' then 'reserved'::public.vehicle_status
                    else 'sold'::public.vehicle_status
                  end
   where id = v_id;
end $$;

create or replace function public.trg_reservations_sync()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_vehicle_status(new.vehicle_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.vehicle_id is distinct from new.vehicle_id) then
    perform public.sync_vehicle_status(old.vehicle_id);
  end if;
  return null;
end $$;
drop trigger if exists reservations_sync on public.reservations;
create trigger reservations_sync after insert or update or delete on public.reservations
  for each row execute function public.trg_reservations_sync();

-- ---------------------------------------------------------------------
-- RLS
--   freight rates: everyone reads; admin/manager edit
--   reservations:  everyone reads and creates; edit = admin/manager or the
--                  agent/creator; delete = admin/manager
-- ---------------------------------------------------------------------
alter table public.freight_rates enable row level security;
alter table public.reservations  enable row level security;

drop policy if exists freight_rates_read on public.freight_rates;
create policy freight_rates_read on public.freight_rates for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists freight_rates_write on public.freight_rates;
create policy freight_rates_write on public.freight_rates for all to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));

drop policy if exists reservations_read on public.reservations;
create policy reservations_read on public.reservations for select to authenticated
  using (public.auth_role() is not null);
drop policy if exists reservations_insert on public.reservations;
create policy reservations_insert on public.reservations for insert to authenticated
  with check (public.auth_role() is not null);
drop policy if exists reservations_update on public.reservations;
create policy reservations_update on public.reservations for update to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]) or sales_agent_id = auth.uid() or created_by = auth.uid())
  with check (public.auth_role() is not null);
drop policy if exists reservations_delete on public.reservations;
create policy reservations_delete on public.reservations for delete to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]));
