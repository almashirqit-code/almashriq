-- =====================================================================
-- 0029: support chat (customer portal <-> ERP inbox)
--
--  * support_threads: one open conversation per portal login. Linked to the
--    customer and their agent once the account is approved.
--  * support_messages: text only (v1), up to 4000 characters.
--  * Who can read (RLS; realtime uses the same rules):
--      - the customer, their own threads;
--      - admins, every thread;
--      - managers/sales, threads of customers they can see
--        (can_see_customer), or assigned to them;
--      - admins/managers, threads not yet linked to a customer.
--  * Writes only through the RPCs below (sender kind, names and unread
--    counters are set by the database, not the browser).
--  * approve_portal_account also links the login's threads.
--  * Both tables are published to supabase_realtime for live updates.
-- Safe to re-run.
-- =====================================================================

create table if not exists public.support_threads (
  id              uuid primary key default gen_random_uuid(),
  portal_user_id  uuid not null references auth.users (id) on delete cascade,
  customer_id     uuid references public.customers (id) on delete set null,
  assigned_to     uuid references public.profiles (id) on delete set null,
  display_name    text not null,
  email           text,
  status          text not null default 'open',
  last_message    text,
  last_message_at timestamptz not null default now(),
  staff_unread    int not null default 0,
  customer_unread int not null default 0,
  created_at      timestamptz not null default now()
);
do $$ begin
  alter table public.support_threads add constraint support_threads_status_chk check (status in ('open', 'closed'));
exception when duplicate_object then null; end $$;
create unique index if not exists support_threads_one_open on public.support_threads (portal_user_id) where status = 'open';
create index if not exists support_threads_customer_idx on public.support_threads (customer_id);
create index if not exists support_threads_assigned_idx on public.support_threads (assigned_to);
create index if not exists support_threads_recent_idx on public.support_threads (status, last_message_at desc);

create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.support_threads (id) on delete cascade,
  sender_id   uuid references auth.users (id) on delete set null,
  sender_kind text not null,
  sender_name text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);
do $$ begin
  alter table public.support_messages add constraint support_messages_kind_chk check (sender_kind in ('customer', 'staff'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.support_messages add constraint support_messages_body_chk check (char_length(body) between 1 and 4000);
exception when duplicate_object then null; end $$;
create index if not exists support_messages_thread_idx on public.support_messages (thread_id, created_at);
create index if not exists support_messages_sender_idx on public.support_messages (sender_id);

-- ---------------------------------------------------------------------
-- Staff visibility of a thread (also used by the staff RPCs).
-- ---------------------------------------------------------------------
create or replace function public.staff_can_see_thread(p_customer uuid, p_assigned uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare r public.user_role := public.auth_role();
begin
  if r is null then return false; end if;
  if r = 'admin' then return true; end if;
  if p_assigned = auth.uid() then return true; end if;
  if p_customer is null then return r = 'manager'; end if;
  return public.can_see_customer(p_customer);
end $$;
revoke all on function public.staff_can_see_thread(uuid, uuid) from public, anon;
grant execute on function public.staff_can_see_thread(uuid, uuid) to authenticated;

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists support_threads_read on public.support_threads;
create policy support_threads_read on public.support_threads for select to authenticated
  using (portal_user_id = (select auth.uid()) or public.staff_can_see_thread(customer_id, assigned_to));

drop policy if exists support_messages_read on public.support_messages;
create policy support_messages_read on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_threads t where t.id = thread_id));  -- thread policy applies

-- ---------------------------------------------------------------------
-- Customer side
-- ---------------------------------------------------------------------
create or replace function public.portal_send_message(p_body text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  acct public.portal_accounts;
  cust public.customers;
  t    public.support_threads;
  msg  public.support_messages;
  b    text := left(nullif(trim(coalesce(p_body, '')), ''), 4000);
  who  text;
begin
  select * into acct from public.portal_accounts where user_id = auth.uid();
  if not found or acct.status = 'rejected' then raise exception 'not authorized'; end if;
  if b is null then raise exception 'Empty message'; end if;
  if acct.status = 'active' then select * into cust from public.customers where id = acct.customer_id; end if;
  who := left(coalesce(nullif(cust.name, ''), acct.full_name, split_part(acct.email, '@', 1)), 120);

  select * into t from public.support_threads where portal_user_id = auth.uid() and status = 'open' for update;
  if not found then
    insert into public.support_threads (portal_user_id, customer_id, assigned_to, display_name, email)
    values (auth.uid(), cust.id, cust.assigned_to, who, acct.email)
    returning * into t;
  end if;
  -- flood guard: 30 messages per 10 minutes per thread from the customer
  if (select count(*) from public.support_messages
       where thread_id = t.id and sender_kind = 'customer' and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many messages, please slow down';
  end if;

  insert into public.support_messages (thread_id, sender_id, sender_kind, sender_name, body)
  values (t.id, auth.uid(), 'customer', who, b)
  returning * into msg;
  update public.support_threads
     set last_message = left(b, 140), last_message_at = msg.created_at,
         staff_unread = staff_unread + 1, customer_unread = 0
   where id = t.id;
  return jsonb_build_object('thread_id', t.id, 'message', to_jsonb(msg) - 'sender_id');
end $$;

create or replace function public.portal_mark_read()
returns void
language sql security definer set search_path = public
as $$
  update public.support_threads set customer_unread = 0
   where portal_user_id = auth.uid() and customer_unread > 0
$$;

-- ---------------------------------------------------------------------
-- Staff side
-- ---------------------------------------------------------------------
create or replace function public.staff_send_message(p_thread uuid, p_body text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  t   public.support_threads;
  msg public.support_messages;
  b   text := left(nullif(trim(coalesce(p_body, '')), ''), 4000);
  who text;
begin
  select * into t from public.support_threads where id = p_thread for update;
  if not found or not public.staff_can_see_thread(t.customer_id, t.assigned_to) then raise exception 'not authorized'; end if;
  if t.status <> 'open' then raise exception 'This conversation is closed'; end if;
  if b is null then raise exception 'Empty message'; end if;
  select left(coalesce(nullif(full_name, ''), split_part(email, '@', 1)), 120) into who from public.profiles where id = auth.uid();

  insert into public.support_messages (thread_id, sender_id, sender_kind, sender_name, body)
  values (t.id, auth.uid(), 'staff', coalesce(who, 'Al Mashriq'), b)
  returning * into msg;
  update public.support_threads
     set last_message = left(b, 140), last_message_at = msg.created_at,
         customer_unread = customer_unread + 1, staff_unread = 0,
         assigned_to = coalesce(assigned_to, auth.uid())  -- first reply takes an unassigned chat
   where id = t.id;
  return jsonb_build_object('thread_id', t.id, 'message', to_jsonb(msg) - 'sender_id');
end $$;

create or replace function public.staff_mark_read(p_thread uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare t public.support_threads;
begin
  select * into t from public.support_threads where id = p_thread;
  if not found or not public.staff_can_see_thread(t.customer_id, t.assigned_to) then raise exception 'not authorized'; end if;
  update public.support_threads set staff_unread = 0 where id = p_thread and staff_unread > 0;
end $$;

-- Re-assign (admin/manager) or close / reopen (anyone who can see it).
create or replace function public.staff_update_thread(p_thread uuid, p_status text default null, p_assign uuid default null, p_unassign boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
declare t public.support_threads;
begin
  select * into t from public.support_threads where id = p_thread for update;
  if not found or not public.staff_can_see_thread(t.customer_id, t.assigned_to) then raise exception 'not authorized'; end if;
  if (p_assign is not null or p_unassign) then
    if not public.is_staff(array['admin', 'manager']::public.user_role[]) then raise exception 'not authorized'; end if;
    if p_assign is not null and not exists (select 1 from public.profiles where id = p_assign and active) then raise exception 'Agent not found'; end if;
    update public.support_threads set assigned_to = case when p_unassign then null else p_assign end where id = p_thread;
  end if;
  if p_status is not null then
    if p_status not in ('open', 'closed') then raise exception 'Invalid status'; end if;
    if p_status = 'open' and exists (select 1 from public.support_threads where portal_user_id = t.portal_user_id and status = 'open' and id <> t.id) then
      raise exception 'This customer already has an open conversation';
    end if;
    update public.support_threads set status = p_status where id = p_thread;
  end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.portal_send_message(text)', 'public.portal_mark_read()',
    'public.staff_send_message(uuid, text)', 'public.staff_mark_read(uuid)',
    'public.staff_update_thread(uuid, text, uuid, boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Approve (same as 0028) + link the login's chat threads.
-- ---------------------------------------------------------------------
create or replace function public.approve_portal_account(p_user uuid, p_customer uuid default null, p_agent uuid default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  acct public.portal_accounts;
  cid  uuid;
  agent uuid;
  cname text;
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

  select c.assigned_to, c.name into agent, cname from public.customers c where c.id = cid;

  -- Inquiries and chats sent while the account was pending now belong to the customer and their agent.
  update public.inquiries i
     set customer_id = cid, assigned_to = coalesce(i.assigned_to, agent)
   where i.portal_user_id = p_user and i.customer_id is null;
  update public.support_threads s
     set customer_id = cid, assigned_to = coalesce(s.assigned_to, agent), display_name = coalesce(nullif(cname, ''), s.display_name)
   where s.portal_user_id = p_user and s.customer_id is null;

  return cid;
end $$;
revoke all on function public.approve_portal_account(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_portal_account(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Live updates (Realtime applies the read policies above per subscriber).
-- ---------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.support_threads;
exception when duplicate_object then null; end $$;
