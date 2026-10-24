-- =====================================================================
-- 0028: customer portal inquiries
--
--  * inquiries.portal_user_id: the portal login that sent it, so a customer
--    can list their own inquiries (including ones sent while pending).
--  * portal_create_inquiry: pending or active portal logins (not rejected).
--    Fills the contact details from the customer record (or the sign-up),
--    links the customer and routes it to the customer's assigned agent.
--    source = 'portal'; shows up in the ERP Inquiries list as usual
--    (can_see_inquiry: the agent, or admins/managers while unassigned).
--  * portal_inquiries: the signed-in login's own inquiries (no staff notes).
--  * approve_portal_account: also attaches inquiries sent while pending to
--    the customer and their agent.
-- Safe to re-run.
-- =====================================================================

alter table public.inquiries
  add column if not exists portal_user_id uuid references auth.users (id) on delete set null;
create index if not exists inquiries_portal_user_idx on public.inquiries (portal_user_id, created_at desc);

create or replace function public.portal_create_inquiry(p_message text, p_stock_no text default null)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  acct  public.portal_accounts;
  cust  public.customers;
  v_id  uuid;
  msg   text := left(nullif(trim(coalesce(p_message, '')), ''), 4000);
  stock text := left(nullif(trim(coalesce(p_stock_no, '')), ''), 40);
  n     bigint;
begin
  select * into acct from public.portal_accounts where user_id = auth.uid();
  if not found or acct.status = 'rejected' then raise exception 'not authorized'; end if;
  if msg is null then raise exception 'Please write your message'; end if;
  -- flood guard per login (the app also rate-limits per IP)
  if (select count(*) from public.inquiries
       where portal_user_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many inquiries, please try again later';
  end if;

  if acct.status = 'active' then
    select * into cust from public.customers where id = acct.customer_id;
  end if;
  if stock is not null then
    select id into v_id from public.vehicles where upper(stock_no) = upper(stock) limit 1;
  end if;

  insert into public.inquiries
    (name, email, phone, country, port, message, vehicle_id, stock_no, source, customer_id, assigned_to, portal_user_id)
  values (
    left(coalesce(nullif(cust.name, ''), acct.full_name, split_part(acct.email, '@', 1)), 120),
    left(nullif(lower(trim(acct.email)), ''), 200),
    left(coalesce(nullif(cust.phone, ''), nullif(cust.whatsapp, ''), acct.phone, acct.whatsapp), 50),
    left(coalesce(nullif(cust.country, ''), acct.country), 80),
    left(coalesce(nullif(cust.port, ''), acct.port), 80),
    msg, v_id, stock, 'portal', cust.id, cust.assigned_to, auth.uid()
  )
  returning inquiry_no into n;
  return n;
end $$;

create or replace function public.portal_inquiries()
returns table (inquiry_no bigint, created_at timestamptz, stock_no text, message text, status text, agent text)
language sql stable security definer set search_path = public
as $$
  select i.inquiry_no, i.created_at, i.stock_no, i.message, i.status,
         (select coalesce(p.full_name, p.email) from public.profiles p where p.id = i.assigned_to)
    from public.inquiries i
   where i.portal_user_id = auth.uid()
   order by i.created_at desc
   limit 100
$$;

revoke all on function public.portal_create_inquiry(text, text) from public, anon;
grant execute on function public.portal_create_inquiry(text, text) to authenticated;
revoke all on function public.portal_inquiries() from public, anon;
grant execute on function public.portal_inquiries() to authenticated;

-- ---------------------------------------------------------------------
-- Approve (same as 0026) + attach inquiries sent while pending.
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

  -- Inquiries sent while the account was pending now belong to the customer and their agent.
  update public.inquiries i
     set customer_id = cid,
         assigned_to = coalesce(i.assigned_to, (select c.assigned_to from public.customers c where c.id = cid))
   where i.portal_user_id = p_user and i.customer_id is null;

  return cid;
end $$;
revoke all on function public.approve_portal_account(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_portal_account(uuid, uuid, uuid) to authenticated;
