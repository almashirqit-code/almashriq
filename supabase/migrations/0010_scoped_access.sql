-- =====================================================================
-- 0010 — Office + shift for staff, and who-sees-what (row level security)
-- Run after 0001–0009. Safe to re-run.
--
--   admin   : everything
--   manager : with an office set → customers/reservations/remittances of
--             their office (plus records with no office yet); all stock.
--             No office set → everything (as before).
--   sales   : available cars + cars they reserved/invoiced; only their own
--             customers (assigned to them, or registered by them and not
--             assigned to anyone else); invoices, reservations and TTs of
--             those customers.
-- =====================================================================

alter table public.profiles
  add column if not exists office text,
  add column if not exists shift  text;

-- ---------------------------------------------------------------------
-- Helpers (security definer: they read profiles/customers without RLS)
-- ---------------------------------------------------------------------
create or replace function public.auth_office()
returns text
language sql stable security definer set search_path = public
as $$
  select nullif(trim(office), '') from public.profiles where id = auth.uid() and active
$$;

create or replace function public.staff_office(uid uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select nullif(trim(office), '') from public.profiles where id = uid
$$;

/** Can the signed-in user see a customer owned (assigned_to / created_by) as given? */
create or replace function public.can_see_customer_row(p_assigned uuid, p_created uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  r public.user_role := public.auth_role();
  mo text;
  owner_office text;
begin
  if r is null then return false; end if;
  if r = 'admin' then return true; end if;
  if r = 'sales' then
    return p_assigned = auth.uid() or (p_assigned is null and p_created = auth.uid());
  end if;
  -- manager
  mo := public.auth_office();
  if mo is null then return true; end if;
  owner_office := public.staff_office(coalesce(p_assigned, p_created));
  return owner_office is null or owner_office = mo;
end $$;

create or replace function public.can_see_customer(p_customer uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select public.can_see_customer_row(c.assigned_to, c.created_by) from public.customers c where c.id = p_customer), false)
$$;

/** Sales: a car that isn't available is visible only when it's in their own deal. */
create or replace function public.sales_owns_vehicle(p_vehicle uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
           select 1 from public.reservations r
            where r.vehicle_id = p_vehicle and r.status <> 'cancelled'
              and (r.sales_agent_id = auth.uid() or r.created_by = auth.uid()))
      or exists (
           select 1 from public.invoice_items it
             join public.invoices i on i.id = it.invoice_id
            where it.vehicle_id = p_vehicle and i.status <> 'cancelled'
              and (i.created_by = auth.uid() or public.can_see_customer(i.customer_id)))
$$;

create or replace function public.can_see_vehicle(p_vehicle uuid, p_status public.vehicle_status)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare r public.user_role := public.auth_role();
begin
  if r is null then return false; end if;
  if r <> 'sales' then return true; end if;
  return p_status = 'in_stock' or public.sales_owns_vehicle(p_vehicle);
end $$;

/** Reservations: own (sales), office (manager), all (admin). */
create or replace function public.can_see_reservation(p_agent uuid, p_created uuid, p_customer uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  r public.user_role := public.auth_role();
  mo text;
  ao text;
begin
  if r is null then return false; end if;
  if r = 'admin' then return true; end if;
  if r = 'sales' then return p_agent = auth.uid() or p_created = auth.uid(); end if;
  mo := public.auth_office();
  if mo is null then return true; end if;
  ao := public.staff_office(coalesce(p_agent, p_created));
  return ao = mo or (ao is null and public.can_see_customer(p_customer));
end $$;

/** Remittances: office (manager), own customers (sales), all (admin). */
create or replace function public.can_see_remittance(p_office text, p_customer uuid, p_created uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  r public.user_role := public.auth_role();
  mo text;
begin
  if r is null then return false; end if;
  if r = 'admin' then return true; end if;
  if r = 'sales' then return p_created = auth.uid() or public.can_see_customer(p_customer); end if;
  mo := public.auth_office();
  return mo is null or nullif(trim(p_office), '') is null or p_office = mo;
end $$;

grant execute on function public.auth_office(), public.staff_office(uuid), public.can_see_customer_row(uuid, uuid),
  public.can_see_customer(uuid), public.sales_owns_vehicle(uuid), public.can_see_vehicle(uuid, public.vehicle_status),
  public.can_see_reservation(uuid, uuid, uuid), public.can_see_remittance(text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select to authenticated
  using (public.can_see_customer_row(assigned_to, created_by));
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated
  with check (
    public.auth_role() is not null
    and (public.auth_role() <> 'sales' or (created_by = auth.uid() and coalesce(assigned_to, auth.uid()) = auth.uid()))
  );
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
  using (public.can_see_customer_row(assigned_to, created_by))
  with check (public.can_see_customer_row(assigned_to, created_by));

-- ---------------------------------------------------------------------
-- Vehicles (sales: available + own deals). Write rules unchanged.
-- ---------------------------------------------------------------------
drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles for select to authenticated
  using (public.can_see_vehicle(id, status));

-- ---------------------------------------------------------------------
-- Invoices, items, payments
-- ---------------------------------------------------------------------
drop policy if exists invoices_read on public.invoices;
create policy invoices_read on public.invoices for select to authenticated
  using (public.is_staff(array['admin']::public.user_role[]) or created_by = auth.uid() or public.can_see_customer(customer_id));
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices for insert to authenticated
  with check (public.auth_role() is not null and public.can_see_customer(customer_id));
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update to authenticated
  using (public.is_staff(array['admin']::public.user_role[]) or created_by = auth.uid() or public.can_see_customer(customer_id))
  with check (public.auth_role() is not null and public.can_see_customer(customer_id));

drop policy if exists items_read on public.invoice_items;
create policy items_read on public.invoice_items for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));
drop policy if exists items_write on public.invoice_items;
create policy items_write on public.invoice_items for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id));

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check (exists (select 1 from public.invoices i where i.id = invoice_id));

-- ---------------------------------------------------------------------
-- Reservations (sales can only book for themselves)
-- ---------------------------------------------------------------------
drop policy if exists reservations_read on public.reservations;
create policy reservations_read on public.reservations for select to authenticated
  using (public.can_see_reservation(sales_agent_id, created_by, customer_id));
drop policy if exists reservations_insert on public.reservations;
create policy reservations_insert on public.reservations for insert to authenticated
  with check (
    public.auth_role() is not null
    and public.can_see_customer(customer_id)
    and (public.auth_role() <> 'sales' or sales_agent_id = auth.uid())
  );
drop policy if exists reservations_update on public.reservations;
create policy reservations_update on public.reservations for update to authenticated
  using (
    public.is_staff(array['admin']::public.user_role[])
    or (public.is_staff(array['manager']::public.user_role[]) and public.can_see_reservation(sales_agent_id, created_by, customer_id))
    or sales_agent_id = auth.uid() or created_by = auth.uid()
  )
  with check (public.auth_role() is not null and (public.auth_role() <> 'sales' or sales_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Remittances (+ documents, allocations follow their remittance)
-- ---------------------------------------------------------------------
drop policy if exists rem_read on public.remittances;
create policy rem_read on public.remittances for select to authenticated
  using (public.can_see_remittance(office, customer_id, created_by));
drop policy if exists rem_insert on public.remittances;
create policy rem_insert on public.remittances for insert to authenticated
  with check (
    public.is_staff(array['admin','manager']::public.user_role[])
    and (public.auth_role() = 'admin' or public.auth_office() is null or office = public.auth_office())
  );
drop policy if exists rem_update on public.remittances;
create policy rem_update on public.remittances for update to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]) and public.can_see_remittance(office, customer_id, created_by))
  with check (
    public.is_staff(array['admin','manager']::public.user_role[])
    and (public.auth_role() = 'admin' or public.auth_office() is null or office = public.auth_office())
  );

drop policy if exists remdoc_read on public.remittance_documents;
create policy remdoc_read on public.remittance_documents for select to authenticated
  using (exists (select 1 from public.remittances r where r.id = remittance_id));
drop policy if exists remalloc_read on public.remittance_allocations;
create policy remalloc_read on public.remittance_allocations for select to authenticated
  using (exists (select 1 from public.remittances r where r.id = remittance_id));

create index if not exists customers_assigned_idx on public.customers (assigned_to);
create index if not exists customers_created_by_idx on public.customers (created_by);
create index if not exists invoices_customer_idx2 on public.invoices (customer_id);
create index if not exists remittances_office_idx on public.remittances (office);
