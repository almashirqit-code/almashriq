-- =====================================================================
-- 0031: favourites (heart on cars, parts and machinery)
--
--  * favorite_events: every add/remove click, anonymous or signed in, so
--    the ERP can see demand ("most wanted"). visitor_id is a random browser
--    id, sent only when the visitor allowed analytics cookies; otherwise null.
--  * portal_favorites: the saved list of signed-in customers (synced across
--    devices). Anonymous visitors keep their list in the browser only.
--  * record_favorite (anon + signed in): validates the item is public, rate
--    guards per visitor, logs the event and keeps portal_favorites in sync.
--  * portal_merge_favorites: merges a browser list into the account.
--  * staff_favorite_top / staff_customer_favorites: ERP views (admin/manager;
--    a customer's list follows can_see_customer).
-- Safe to re-run.
-- =====================================================================

create table if not exists public.favorite_events (
  id             bigint generated always as identity primary key,
  item_kind      text not null,
  item_id        uuid not null,
  stock_no       text,
  action         text not null,
  visitor_id     text,
  portal_user_id uuid references auth.users (id) on delete set null,
  customer_id    uuid references public.customers (id) on delete set null,
  created_at     timestamptz not null default now()
);
do $$ begin
  alter table public.favorite_events add constraint favorite_events_kind_chk check (item_kind in ('vehicle', 'part', 'machine'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.favorite_events add constraint favorite_events_action_chk check (action in ('add', 'remove'));
exception when duplicate_object then null; end $$;
create index if not exists favorite_events_item_idx on public.favorite_events (item_kind, item_id, created_at desc);
create index if not exists favorite_events_recent_idx on public.favorite_events (created_at desc);
create index if not exists favorite_events_customer_idx on public.favorite_events (customer_id, created_at desc);
create index if not exists favorite_events_visitor_idx on public.favorite_events (visitor_id, created_at desc);
create index if not exists favorite_events_portal_user_idx on public.favorite_events (portal_user_id);

create table if not exists public.portal_favorites (
  portal_user_id uuid not null references auth.users (id) on delete cascade,
  item_kind      text not null,
  item_id        uuid not null,
  stock_no       text,
  title          text,
  created_at     timestamptz not null default now(),
  primary key (portal_user_id, item_kind, item_id)
);
do $$ begin
  alter table public.portal_favorites add constraint portal_favorites_kind_chk check (item_kind in ('vehicle', 'part', 'machine'));
exception when duplicate_object then null; end $$;

alter table public.favorite_events enable row level security;
alter table public.portal_favorites enable row level security;

drop policy if exists favorite_events_staff on public.favorite_events;
create policy favorite_events_staff on public.favorite_events for select to authenticated
  using ((select public.is_staff(array['admin', 'manager']::public.user_role[])));

drop policy if exists portal_favorites_own on public.portal_favorites;
create policy portal_favorites_own on public.portal_favorites for select to authenticated
  using (portal_user_id = (select auth.uid()));

-- Public item → stock no. (only items shown on the website can be favourited).
create or replace function public.favorite_item_ref(p_kind text, p_item uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case p_kind
    when 'vehicle' then (select stock_no from public.vehicles where id = p_item and show_on_website)
    when 'part'    then (select part_no  from public.parts    where id = p_item and show_on_website)
    when 'machine' then (select stock_no from public.machinery where id = p_item and show_on_website)
  end
$$;
revoke all on function public.favorite_item_ref(text, uuid) from public, anon, authenticated;

create or replace function public.record_favorite(p_kind text, p_item uuid, p_action text, p_visitor text default null, p_title text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  ref  text;
  acct public.portal_accounts;
  vis  text := case when p_visitor ~ '^[0-9a-f-]{36}$' then p_visitor end;
begin
  if p_kind not in ('vehicle', 'part', 'machine') or p_action not in ('add', 'remove') then return; end if;
  ref := public.favorite_item_ref(p_kind, p_item);
  if ref is null then return; end if;
  -- flood guard for anonymous visitors
  if vis is not null and (select count(*) from public.favorite_events where visitor_id = vis and created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;

  if auth.uid() is not null then
    select * into acct from public.portal_accounts where user_id = auth.uid() and status <> 'rejected';
  end if;

  insert into public.favorite_events (item_kind, item_id, stock_no, action, visitor_id, portal_user_id, customer_id)
  values (p_kind, p_item, ref, p_action, vis, acct.user_id, case when acct.status = 'active' then acct.customer_id end);

  if acct.user_id is not null then
    if p_action = 'add' then
      insert into public.portal_favorites (portal_user_id, item_kind, item_id, stock_no, title)
      values (acct.user_id, p_kind, p_item, ref, left(nullif(trim(coalesce(p_title, '')), ''), 200))
      on conflict (portal_user_id, item_kind, item_id) do nothing;
    else
      delete from public.portal_favorites where portal_user_id = acct.user_id and item_kind = p_kind and item_id = p_item;
    end if;
  end if;
end $$;
revoke all on function public.record_favorite(text, uuid, text, text, text) from public;
grant execute on function public.record_favorite(text, uuid, text, text, text) to anon, authenticated;

-- Merge the browser's list into the signed-in customer's account; returns the full saved list.
create or replace function public.portal_merge_favorites(p_items jsonb)
returns table (item_kind text, item_id uuid, stock_no text, title text, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  it jsonb;
  ref text;
begin
  if me is null or not exists (select 1 from public.portal_accounts where user_id = me and status <> 'rejected') then return; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) limit 200 loop
    if (it ->> 'kind') in ('vehicle', 'part', 'machine') and (it ->> 'id') ~ '^[0-9a-f-]{36}$' then
      ref := public.favorite_item_ref(it ->> 'kind', (it ->> 'id')::uuid);
      if ref is not null then
        insert into public.portal_favorites (portal_user_id, item_kind, item_id, stock_no, title)
        values (me, it ->> 'kind', (it ->> 'id')::uuid, ref, left(nullif(trim(coalesce(it ->> 'title', '')), ''), 200))
        -- by constraint name: the column names clash with this function's out columns
        on conflict on constraint portal_favorites_pkey do nothing;
      end if;
    end if;
  end loop;
  return query
    select f.item_kind, f.item_id, f.stock_no, f.title, f.created_at
      from public.portal_favorites f where f.portal_user_id = me order by f.created_at desc;
end $$;
revoke all on function public.portal_merge_favorites(jsonb) from public, anon;
grant execute on function public.portal_merge_favorites(jsonb) to authenticated;

-- ERP: most-wanted items over the last N days (admin/manager).
create or replace function public.staff_favorite_top(p_days int default 30)
returns table (item_kind text, item_id uuid, stock_no text, title text, people bigint, adds bigint, last_at timestamptz, status text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_staff(array['admin', 'manager']::public.user_role[]) then raise exception 'not authorized'; end if;
  return query
    with e as (
      select fe.item_kind, fe.item_id, max(fe.stock_no) as stock_no,
             count(distinct coalesce(fe.portal_user_id::text, fe.visitor_id, fe.id::text)) as people,
             count(*) as adds, max(fe.created_at) as last_at
        from public.favorite_events fe
       where fe.action = 'add' and fe.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
       group by fe.item_kind, fe.item_id
    )
    select e.item_kind, e.item_id, e.stock_no,
           coalesce(
             (select concat_ws(' ', v.year, v.make, v.model) from public.vehicles v where e.item_kind = 'vehicle' and v.id = e.item_id),
             (select p.name from public.parts p where e.item_kind = 'part' and p.id = e.item_id),
             (select concat_ws(' ', m.year, m.make, m.model) from public.machinery m where e.item_kind = 'machine' and m.id = e.item_id)),
           e.people, e.adds, e.last_at,
           coalesce(
             (select v.status::text from public.vehicles v where e.item_kind = 'vehicle' and v.id = e.item_id),
             (select p.status::text from public.parts p where e.item_kind = 'part' and p.id = e.item_id),
             (select m.status::text from public.machinery m where e.item_kind = 'machine' and m.id = e.item_id))
      from e
     order by e.people desc, e.adds desc, e.last_at desc
     limit 100;
end $$;
revoke all on function public.staff_favorite_top(int) from public, anon;
grant execute on function public.staff_favorite_top(int) to authenticated;

-- ERP: a customer's saved items (staff who can see the customer).
create or replace function public.staff_customer_favorites(p_customer uuid)
returns table (item_kind text, item_id uuid, stock_no text, title text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.auth_role() is null or not public.can_see_customer(p_customer) then return; end if;
  return query
    select f.item_kind, f.item_id, f.stock_no, f.title, f.created_at
      from public.portal_favorites f
      join public.portal_accounts pa on pa.user_id = f.portal_user_id
     where pa.customer_id = p_customer
     order by f.created_at desc;
end $$;
revoke all on function public.staff_customer_favorites(uuid) from public, anon;
grant execute on function public.staff_customer_favorites(uuid) to authenticated;
