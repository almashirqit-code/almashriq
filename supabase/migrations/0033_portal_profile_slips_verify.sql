-- =====================================================================
-- 0033: customer profile + picture, payment slips, "is this agent real?"
--
--  * Profile: customers edit their own name and contact details
--    (portal_update_profile). On a linked account the contact details are
--    copied to the customer record so the agent sees them; the customer's
--    name/company on that record stay as staff set them (they print on
--    invoices). Pictures: uploaded to site-assets/portal-avatars/<uid>/ or a
--    generated avatar (set_my_portal_avatar), like staff avatars in 0013.
--  * Payment slips: a linked customer uploads a TT / bank transfer slip with
--    the amount. Files live in the private 'payment-slips' bucket under
--    <customer_id>/<random>.<ext>; only the server (service key) uploads and
--    signs them. Staff who can see the customer view them; an admin/manager
--    marks each slip received or rejected. The TT itself is still entered in
--    Remittances once the money reaches the bank.
--  * Agent check: anyone (no login) types the phone, WhatsApp or email that
--    contacted them; public_verify_contact says whether it belongs to an
--    active staff member, a former one, or the company's own lines. Staff
--    phone/WhatsApp are new profile columns set by an admin.
--  * New vehicles default to a USD asking price (was JPY), like parts and
--    machinery. Existing prices are not changed.
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------
alter table public.portal_accounts add column if not exists avatar_url text;

create or replace function public.portal_me()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'status', pa.status,
    'full_name', pa.full_name,
    'email', pa.email,
    'company', pa.company,
    'phone', pa.phone,
    'whatsapp', pa.whatsapp,
    'country', pa.country,
    'port', pa.port,
    'avatar_url', pa.avatar_url,
    'customer', case when pa.status = 'active' then (
      select jsonb_build_object('customer_no', c.customer_no, 'name', c.name, 'company', c.company, 'country', c.country, 'port', c.port)
        from public.customers c where c.id = pa.customer_id) end,
    'agent', case when pa.status = 'active' then (
      select jsonb_build_object('name', coalesce(p.full_name, p.email), 'email', p.email)
        from public.customers c join public.profiles p on p.id = c.assigned_to
       where c.id = pa.customer_id) end
  )
  from public.portal_accounts pa
  where pa.user_id = auth.uid()
$$;

create or replace function public.portal_update_profile(
  p_full_name text, p_company text, p_phone text, p_whatsapp text, p_country text, p_port text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  acct public.portal_accounts;
  v_phone text := left(nullif(trim(coalesce(p_phone, '')), ''), 40);
  v_wa    text := left(nullif(trim(coalesce(p_whatsapp, '')), ''), 40);
  v_cty   text := left(nullif(trim(coalesce(p_country, '')), ''), 80);
  v_port  text := left(nullif(trim(coalesce(p_port, '')), ''), 80);
begin
  select * into acct from public.portal_accounts where user_id = auth.uid() for update;
  if not found or acct.status = 'rejected' then raise exception 'not authorized'; end if;
  if nullif(trim(coalesce(p_full_name, '')), '') is null then raise exception 'Name is required'; end if;

  update public.portal_accounts
     set full_name = left(trim(p_full_name), 120),
         company   = left(nullif(trim(coalesce(p_company, '')), ''), 120),
         phone = v_phone, whatsapp = v_wa, country = v_cty, port = v_port
   where user_id = auth.uid();

  -- Keep the agent's customer record current; a blank field never wipes what staff entered.
  if acct.status = 'active' and acct.customer_id is not null then
    update public.customers
       set phone    = coalesce(v_phone, phone),
           whatsapp = coalesce(v_wa, whatsapp),
           country  = coalesce(v_cty, country),
           port     = coalesce(v_port, port)
     where id = acct.customer_id;
  end if;
end $$;

-- Customers upload only into their own folder, and only with a live (not rejected) account.
drop policy if exists "portal avatar upload" on storage.objects;
create policy "portal avatar upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-assets' and name like 'portal-avatars/' || auth.uid()::text || '/%'
              and exists (select 1 from public.portal_accounts pa where pa.user_id = auth.uid() and pa.status <> 'rejected'));

create or replace function public.set_my_portal_avatar(p_url text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_url is not null and p_url !~ '^https://api\.dicebear\.com/'
     and not (p_url like 'portal-avatars/' || auth.uid()::text || '/%' and p_url !~ '\.\.') then
    raise exception 'invalid avatar';
  end if;
  update public.portal_accounts set avatar_url = p_url where user_id = auth.uid() and status <> 'rejected';
end $$;

-- ---------------------------------------------------------------------
-- Payment slips
-- ---------------------------------------------------------------------
create table if not exists public.payment_slips (
  id             bigint generated by default as identity primary key,
  customer_id    uuid not null references public.customers (id) on delete cascade,
  portal_user_id uuid references auth.users (id) on delete set null,
  currency       text not null,
  amount         numeric(14, 2) not null,
  sent_on        date not null,
  bank           text,
  reference      text,
  note           text,
  file_path      text not null,
  file_name      text not null,
  file_type      text not null,
  file_size      int  not null,
  status         text not null default 'submitted',
  staff_note     text,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);

do $$ begin
  alter table public.payment_slips add constraint payment_slips_values_chk check (
    currency in ('JPY', 'USD', 'EUR', 'GBP')
    and amount > 0
    and status in ('submitted', 'received', 'rejected')
    and char_length(coalesce(bank, '')) <= 120
    and char_length(coalesce(reference, '')) <= 120
    and char_length(coalesce(note, '')) <= 1000
    and char_length(coalesce(staff_note, '')) <= 500
    and file_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    and file_size between 1 and 10485760
    and char_length(file_name) between 1 and 200);
exception when duplicate_object then null; end $$;

create index if not exists payment_slips_customer_idx on public.payment_slips (customer_id, created_at desc);
create index if not exists payment_slips_status_idx   on public.payment_slips (status, created_at desc);
create index if not exists payment_slips_user_idx     on public.payment_slips (portal_user_id);
create index if not exists payment_slips_reviewer_idx on public.payment_slips (reviewed_by);

-- Staff read the slips of customers they can see. All writes go through the functions below.
alter table public.payment_slips enable row level security;
drop policy if exists payment_slips_staff on public.payment_slips;
create policy payment_slips_staff on public.payment_slips for select to authenticated
  using ((select public.can_see_customer(customer_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-slips', 'payment-slips', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create or replace function public.portal_submit_slip(
  p_currency text, p_amount numeric, p_sent_on date, p_bank text, p_reference text, p_note text,
  p_file_path text, p_file_name text, p_file_type text, p_file_size int)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  cid    uuid := public.portal_customer_id();
  new_id bigint;
begin
  if cid is null then raise exception 'not authorized'; end if;
  if p_file_path is null or p_file_path not like cid::text || '/%' then raise exception 'Invalid file'; end if;
  if p_sent_on is null or p_sent_on > current_date + 1 or p_sent_on < current_date - 366 then
    raise exception 'Check the transfer date';
  end if;
  if (select count(*) from public.payment_slips where customer_id = cid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Too many slips today';
  end if;
  insert into public.payment_slips (customer_id, portal_user_id, currency, amount, sent_on, bank, reference, note,
                                    file_path, file_name, file_type, file_size)
  values (cid, auth.uid(), p_currency, round(p_amount, 2), p_sent_on,
          left(nullif(trim(coalesce(p_bank, '')), ''), 120), left(nullif(trim(coalesce(p_reference, '')), ''), 120),
          left(nullif(trim(coalesce(p_note, '')), ''), 1000),
          p_file_path, left(p_file_name, 200), p_file_type, p_file_size)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.portal_payment_slips()
returns table (
  id bigint, currency text, amount numeric, sent_on date, bank text, reference text, note text,
  file_name text, file_type text, status text, staff_note text, created_at timestamptz, reviewed_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select s.id, s.currency, s.amount, s.sent_on, s.bank, s.reference, s.note,
         s.file_name, s.file_type, s.status, s.staff_note, s.created_at, s.reviewed_at
    from public.payment_slips s
   where s.customer_id = public.portal_customer_id()
   order by s.created_at desc
$$;

-- Storage path of one of the customer's own slips (the file route signs it).
create or replace function public.portal_slip_file(p_id bigint)
returns table (path text, file_name text, file_type text)
language sql stable security definer set search_path = public
as $$
  select s.file_path, s.file_name, s.file_type
    from public.payment_slips s
   where s.id = p_id and s.customer_id = public.portal_customer_id()
$$;

create or replace function public.staff_review_slip(p_id bigint, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  cid uuid;
begin
  -- Same people who enter TTs (Remittances): admin and manager. Sales agents can view.
  if not public.is_staff(array['admin', 'manager']::public.user_role[]) then raise exception 'not authorized'; end if;
  if p_status not in ('submitted', 'received', 'rejected') then raise exception 'Invalid status'; end if;
  select customer_id into cid from public.payment_slips where id = p_id for update;
  if cid is null or not public.can_see_customer(cid) then raise exception 'Slip not found'; end if;
  update public.payment_slips
     set status      = p_status,
         staff_note  = left(nullif(trim(coalesce(p_note, '')), ''), 500),
         reviewed_by = case when p_status = 'submitted' then null else auth.uid() end,
         reviewed_at = case when p_status = 'submitted' then null else now() end
   where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- "Is this agent real?"
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists phone    text,
  add column if not exists whatsapp text;

-- Last 9 digits of a phone number (so +81 90…, 090… and spaces/dashes all match), or null if too short.
create or replace function public.phone_tail(p text)
returns text
language sql immutable set search_path = public
as $$
  select case when char_length(d) >= 8 then right(d, 9) end
    from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;
revoke all on function public.phone_tail(text) from public, anon, authenticated;

create or replace function public.public_verify_contact(p_query text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  q        text := lower(trim(coalesce(p_query, '')));
  is_email boolean;
  tail     text;
  p        public.profiles;
  s        record;
begin
  if char_length(q) < 6 or char_length(q) > 200 then return jsonb_build_object('result', 'invalid'); end if;
  is_email := q ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$';
  tail := case when is_email then null else public.phone_tail(q) end;
  if not is_email and tail is null then return jsonb_build_object('result', 'invalid'); end if;

  select * into p
    from public.profiles pr
   where (is_email and lower(pr.email) = q)
      or (tail is not null and (public.phone_tail(pr.phone) = tail or public.phone_tail(pr.whatsapp) = tail))
   order by pr.active desc
   limit 1;
  if found then
    if not p.active then return jsonb_build_object('result', 'former'); end if;
    -- Only what helps a customer recognise the person: never their email, phone or office shift.
    return jsonb_build_object(
      'result', 'staff',
      'name', coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)),
      'role', p.role::text,
      'office', nullif(trim(coalesce(p.office, '')), ''),
      'avatar_url', p.avatar_url);
  end if;

  select st.email, st.phone, st.mobile, st.fax into s from public.settings st where st.id = 1;
  if (is_email and lower(coalesce(s.email, '')) = q)
     or (tail is not null and tail in (public.phone_tail(s.phone), public.phone_tail(s.mobile), public.phone_tail(s.fax))) then
    return jsonb_build_object('result', 'company');
  end if;
  return jsonb_build_object('result', 'none');
end $$;

-- ---------------------------------------------------------------------
-- Asking price currency
-- ---------------------------------------------------------------------
alter table public.vehicles alter column price_currency set default 'USD';

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.portal_me()',
    'public.portal_update_profile(text, text, text, text, text, text)',
    'public.set_my_portal_avatar(text)',
    'public.portal_submit_slip(text, numeric, date, text, text, text, text, text, text, int)',
    'public.portal_payment_slips()',
    'public.portal_slip_file(bigint)',
    'public.staff_review_slip(bigint, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

revoke all on function public.public_verify_contact(text) from public;
grant execute on function public.public_verify_contact(text) to anon, authenticated;
