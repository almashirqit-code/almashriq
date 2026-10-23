-- =====================================================================
-- 0026: customer portal accounts
--
--  * portal_accounts: one row per customer login (self sign-up on the
--    website). Starts 'pending'; an admin/manager links it to a customers
--    row and assigns an agent ('active'), or rejects it.
--  * handle_new_user: non-staff sign-ups (see 0025) now get a pending
--    portal_accounts row instead of nothing. They still never get a staff
--    profile, so auth_role() stays null and the ERP stays closed to them.
--  * portal_customer_id(): the customer linked to the signed-in login, only
--    when active. Every portal_* data function is scoped by it.
--  * approve_portal_account / reject_portal_account: admin/manager only.
--    Customers can never link themselves to a customer record.
-- Safe to re-run.
-- =====================================================================

create table if not exists public.portal_accounts (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  customer_id  uuid references public.customers (id) on delete set null,
  status       text not null default 'pending',
  email        text not null,
  full_name    text,
  company      text,
  phone        text,
  whatsapp     text,
  country      text,
  port         text,
  approved_by  uuid references public.profiles (id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz not null default now()
);

do $$ begin
  alter table public.portal_accounts add constraint portal_accounts_status_chk
    check (status in ('pending', 'active', 'rejected'));
exception when duplicate_object then null; end $$;

create index if not exists portal_accounts_customer_idx on public.portal_accounts (customer_id);
create index if not exists portal_accounts_status_idx   on public.portal_accounts (status, created_at desc);
create index if not exists portal_accounts_approved_by_idx on public.portal_accounts (approved_by);

-- Reads only. All writes go through the sign-up trigger and the RPCs below.
alter table public.portal_accounts enable row level security;

drop policy if exists portal_accounts_own on public.portal_accounts;
create policy portal_accounts_own on public.portal_accounts for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists portal_accounts_staff on public.portal_accounts;
create policy portal_accounts_staff on public.portal_accounts for select to authenticated
  using ((select public.is_staff(array['admin', 'manager']::public.user_role[])));

-- ---------------------------------------------------------------------
-- Sign-up trigger: staff (bootstrap admin / created in the ERP) get a
-- profile; everyone else gets a pending portal account.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  is_first boolean;
  is_staff boolean;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  select not exists (select 1 from public.profiles) into is_first;
  is_staff := coalesce(new.raw_app_meta_data ->> 'staff', '') = 'true';

  if not (is_first or is_staff) then
    insert into public.portal_accounts (user_id, email, full_name, company, phone, whatsapp, country, port)
    values (
      new.id,
      coalesce(new.email, ''),
      left(nullif(trim(meta ->> 'full_name'), ''), 120),
      left(nullif(trim(meta ->> 'company'), ''), 120),
      left(nullif(trim(meta ->> 'phone'), ''), 40),
      left(nullif(trim(meta ->> 'whatsapp'), ''), 40),
      left(nullif(trim(meta ->> 'country'), ''), 80),
      left(nullif(trim(meta ->> 'port'), ''), 80)
    )
    on conflict (user_id) do nothing;
    return new;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(meta ->> 'full_name', split_part(new.email, '@', 1)),
    case when is_first then 'admin'::public.user_role else 'sales'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- The customer linked to the signed-in portal login (null unless active).
-- ---------------------------------------------------------------------
create or replace function public.portal_customer_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select customer_id from public.portal_accounts
   where user_id = auth.uid() and status = 'active'
$$;
revoke all on function public.portal_customer_id() from public, anon;
grant execute on function public.portal_customer_id() to authenticated;

-- ---------------------------------------------------------------------
-- Approve: link to an existing customer, or create one from the sign-up
-- details; optionally assign the agent. Returns the customer id.
-- ---------------------------------------------------------------------
create or replace function public.approve_portal_account(p_user uuid, p_customer uuid default null, p_agent uuid default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  acct public.portal_accounts;
  cid  uuid;
begin
  if not public.is_staff(array['admin', 'manager']::public.user_role[]) then
    raise exception 'not authorized';
  end if;

  select * into acct from public.portal_accounts where user_id = p_user for update;
  if not found then raise exception 'Sign-up not found'; end if;

  if p_agent is not null and not exists (select 1 from public.profiles where id = p_agent and active) then
    raise exception 'Agent not found';
  end if;

  if p_customer is null then
    insert into public.customers (name, company, country, port, email, phone, whatsapp, assigned_to, created_by)
    values (
      coalesce(acct.full_name, split_part(acct.email, '@', 1)),
      acct.company, acct.country, acct.port, acct.email, acct.phone, acct.whatsapp,
      p_agent, auth.uid()
    )
    returning id into cid;
  else
    -- Same visibility as the Customers list (a manager can only link customers of their office).
    select id into cid from public.customers where id = p_customer;
    if cid is null or not public.can_see_customer(cid) then raise exception 'Customer not found'; end if;
    update public.customers
       set assigned_to = coalesce(p_agent, assigned_to),
           email       = coalesce(nullif(email, ''), acct.email)
     where id = cid;
  end if;

  update public.portal_accounts
     set customer_id = cid, status = 'active', approved_by = auth.uid(), approved_at = now()
   where user_id = p_user;
  return cid;
end $$;
revoke all on function public.approve_portal_account(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_portal_account(uuid, uuid, uuid) to authenticated;

create or replace function public.reject_portal_account(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff(array['admin', 'manager']::public.user_role[]) then
    raise exception 'not authorized';
  end if;
  update public.portal_accounts
     set status = 'rejected', customer_id = null, approved_by = auth.uid(), approved_at = now()
   where user_id = p_user;
end $$;
revoke all on function public.reject_portal_account(uuid) from public, anon;
grant execute on function public.reject_portal_account(uuid) to authenticated;
