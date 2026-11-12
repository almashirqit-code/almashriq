-- =====================================================================
-- 0044: container charges — ocean freight, THC, vanning, courier; prepaid /
--       collect; each car's share booked in the expense book
--
--  * vehicle_shipments gains thc_charges (JPY, like vanning), freight_terms
--    (prepaid / collect) and charges_scope:
--      'car'        the amounts are this car's own
--      'container'  the amounts (courier charges too) are the container's
--                   totals, the same on every car of that container, split
--                   equally between them
--  * Each car's share is kept as company_expenses rows linked to the car
--    (category 'shipping', one per charge), so it counts in the car's cost
--    and profit in the ledger. Collect freight is paid by the customer at
--    destination: it is not our expense; THC, vanning and courier still are.
--  * Kept in step by a trigger: saving, sharing or removing a shipment, or
--    adding a car to a container, re-books every car of that container.
-- Run after 0043. Safe to re-run.
-- =====================================================================

alter table public.vehicle_shipments
  add column if not exists thc_charges   numeric(14, 2),
  add column if not exists freight_terms text,
  add column if not exists charges_scope text not null default 'car';
do $$ begin
  alter table public.vehicle_shipments add constraint vehicle_shipments_charges_chk check (
    (freight_terms is null or freight_terms in ('prepaid', 'collect'))
    and charges_scope in ('car', 'container')
    and coalesce(thc_charges, 0) >= 0);
exception when duplicate_object then null; end $$;

-- Which shipping charge an expense row is (null = an ordinary expense).
alter table public.company_expenses
  add column if not exists shipping_charge text;
do $$ begin
  alter table public.company_expenses add constraint company_expenses_shipping_charge_chk
    check (shipping_charge is null or shipping_charge in ('freight', 'thc', 'vanning', 'courier'));
exception when duplicate_object then null; end $$;
create unique index if not exists company_expenses_shipping_charge_uq
  on public.company_expenses (vehicle_id, shipping_charge) where shipping_charge is not null;

-- ---------------------------------------------------------------------
-- One car's shipping charges → its expense rows
-- ---------------------------------------------------------------------
create or replace function public.sync_shipping_expenses(v_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  s      public.vehicle_shipments%rowtype;
  car    text;
  cn     text;
  n      int := 1;
  k      text;
  total  numeric;
  share  numeric;
  cur    text;
  rate   numeric;
  d      date;
  label  text;
  payee  text;
  refno  text;
begin
  if v_id is null then return; end if;
  select * into s from public.vehicle_shipments where vehicle_id = v_id;
  if not found then
    delete from public.company_expenses where vehicle_id = v_id and shipping_charge is not null;
    return;
  end if;
  select stock_no || ' ' || make || ' ' || model into car from public.vehicles where id = v_id;

  cn := upper(nullif(trim(s.container_no), ''));
  if s.charges_scope = 'container' and cn is not null then
    select count(*) into n from public.vehicle_shipments
     where upper(trim(container_no)) = cn and charges_scope = 'container';
  end if;

  foreach k in array array['freight', 'thc', 'vanning', 'courier'] loop
    total := case k
               when 'freight' then case when s.freight_terms = 'collect' then null else s.freight_charges end
               when 'thc' then s.thc_charges
               when 'vanning' then s.vanning_charges
               else s.courier_charges
             end;
    share := round(coalesce(total, 0) / greatest(n, 1), 2);
    if share <= 0 then
      delete from public.company_expenses where vehicle_id = v_id and shipping_charge = k;
      continue;
    end if;

    cur := case when k = 'freight' then coalesce(s.freight_currency, 'USD') else 'JPY' end;
    rate := 1;
    if cur <> 'JPY' then
      -- Configuration rate (1 unit = N JPY); kept on the row afterwards
      select nullif((exchange_rates ->> cur)::numeric, 0) into rate from public.settings limit 1;
      rate := coalesce(rate, case cur when 'USD' then 150 when 'EUR' then 163 when 'GBP' then 191 else 1 end);
    end if;

    if k = 'courier' then
      d     := coalesce(s.courier_date, s.bl_date, s.etd);
      label := 'Courier' || coalesce(' ' || nullif(trim(s.courier_service), ''), '');
      payee := coalesce(nullif(trim(s.courier_service), ''), nullif(trim(s.courier_company), ''));
      refno := nullif(trim(s.courier_tracking), '');
    else
      d     := coalesce(s.bl_date, s.etd);
      label := case k when 'freight' then 'Ocean freight' when 'thc' then 'THC' else 'Vanning' end;
      payee := coalesce(nullif(trim(s.ship_company), ''), nullif(trim(s.forwarding_agent), ''));
      refno := coalesce(nullif(trim(s.bl_no), ''), nullif(trim(s.booking_no), ''));
    end if;

    insert into public.company_expenses
      (expense_date, category, description, paid_to, reference, currency, amount, fx_rate, vehicle_id, shipping_charge)
    values (
      coalesce(d, current_date),
      'shipping',
      left(label || ' · ' || coalesce(car, '') || case when n > 1 then ' · container ' || cn || ' ÷ ' || n else '' end, 300),
      left(payee, 120), left(refno, 120), cur, share, rate, v_id, k)
    on conflict (vehicle_id, shipping_charge) where shipping_charge is not null do update
      set expense_date = coalesce(d, company_expenses.expense_date),
          description  = excluded.description,
          paid_to      = excluded.paid_to,
          reference    = excluded.reference,
          amount       = excluded.amount,
          currency     = excluded.currency,
          fx_rate      = case when company_expenses.currency = excluded.currency then company_expenses.fx_rate else excluded.fx_rate end
      where (company_expenses.expense_date, company_expenses.description, company_expenses.paid_to, company_expenses.reference,
             company_expenses.amount, company_expenses.currency)
            is distinct from
            (coalesce(d, company_expenses.expense_date), excluded.description, excluded.paid_to, excluded.reference,
             excluded.amount, excluded.currency);
  end loop;
end $$;

-- A change to one car re-books every car of its container (old and new): the split depends on how many there are.
create or replace function public.trg_shipping_expenses()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  ids uuid[] := '{}';
  cns text[] := '{}';
  id  uuid;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    ids := ids || new.vehicle_id;
    cns := cns || upper(nullif(trim(new.container_no), ''));
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    ids := ids || old.vehicle_id;
    cns := cns || upper(nullif(trim(old.container_no), ''));
  end if;
  if tg_op = 'DELETE' then
    -- the car itself was deleted: its expense rows lost their car
    delete from public.company_expenses where shipping_charge is not null and vehicle_id is null;
  end if;
  for id in
    select unnest(ids)
    union
    select vehicle_id from public.vehicle_shipments where upper(trim(container_no)) = any (cns)
  loop
    perform public.sync_shipping_expenses(id);
  end loop;
  return null;
end $$;

revoke all on function public.sync_shipping_expenses(uuid) from public, anon, authenticated;
revoke all on function public.trg_shipping_expenses() from public, anon, authenticated;

drop trigger if exists vehicle_shipments_expenses on public.vehicle_shipments;
create trigger vehicle_shipments_expenses
  after insert or delete or update of container_no, charges_scope, freight_charges, freight_currency, freight_terms, thc_charges,
    vanning_charges, bl_date, etd, bl_no, booking_no, ship_company, forwarding_agent, courier_charges, courier_date,
    courier_service, courier_company, courier_tracking
  on public.vehicle_shipments
  for each row execute function public.trg_shipping_expenses();

-- Charges already saved on cars
do $$
declare
  id uuid;
begin
  for id in select vehicle_id from public.vehicle_shipments loop
    perform public.sync_shipping_expenses(id);
  end loop;
end $$;
